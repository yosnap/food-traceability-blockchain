import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import Breadcrumb from '@/components/Breadcrumb';
import { calculateExpirationInfo } from '@/utils/expirationUtils';

interface ReportStats {
  totalProducts: number;
  activeProducts: number;
  expiredProducts: number;
  transferredProducts: number;
  avgShelfLife: number;
  categoryBreakdown: { [key: string]: number };
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState('30'); // días
  const [selectedReport, setSelectedReport] = useState<'overview' | 'products' | 'transfers'>('overview');

  useEffect(() => {
    let mounted = true;
    let loadStarted = false;
    
    const checkAuthAndLoad = async () => {
      if (!mounted || loadStarted) return;
      loadStarted = true;
      
      // Check auth
      if (typeof window !== 'undefined') {
        const storedRole = localStorage.getItem('userRole');
        const storedUser = localStorage.getItem('authUser');
        
        if (!storedRole || !storedUser) {
          router.push('/auth');
          return;
        }
        
        if (storedRole !== UserRole.PRODUCER) {
          toast.error('Acceso denegado: Se requiere rol de Productor');
          router.push('/auth');
          return;
        }
      }

      if (mounted) {
        await loadReportData();
      }
    };
    
    checkAuthAndLoad();
    
    return () => {
      mounted = false;
    };
  }, [selectedDateRange]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Cargando datos para reportes...');
      
      // Importar funciones de API para cargar productos y transferencias reales
      const { getMyProducts, getMyTransfers } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      // Cargar transferencias del usuario autenticado
      const transfersResponse = await getMyTransfers();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos cargados para reportes:', productsResponse.data);
        
        // Convertir FoodAsset[] a Product[] para compatibilidad con la UI
        const convertedProducts = productsResponse.data.map((foodAsset: any) => ({
          id: foodAsset.id,
          name: foodAsset.name,
          batchNumber: foodAsset.batchNumber || foodAsset.attributes?.batchNumber,
          productionDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
          expirationDate: foodAsset.expirationDate || foodAsset.attributes?.expirationDate,
          status: foodAsset.status || ProductStatus.ACTIVE,
          currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Sin ubicación',
          temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 4,
          humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 85,
          quantity: foodAsset.amount || 1, // Mapear el campo amount del blockchain como quantity
          producer: {
            id: 'current-user',
            name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Finca Demo',
            location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Sin ubicación'
          },
          metadata: {
            variety: foodAsset.variety || foodAsset.attributes?.variety || 'Sin especificar',
            weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
            certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'Sin certificación',
            harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            description: foodAsset.description || foodAsset.attributes?.description || 'Sin descripción',
            brand: foodAsset.brand || foodAsset.attributes?.brand || 'Sin marca',
            category: foodAsset.category || foodAsset.attributes?.category || 'Sin categoría'
          }
        }));
        
        setProducts(convertedProducts);
        
        // Obtener transferencias si están disponibles
        const transfersData = transfersResponse.success ? transfersResponse.data : [];
        console.log('✅ Transferencias cargadas:', transfersData);
        setTransfers(transfersData);
        
        // Calcular estadísticas
        const reportStats = calculateStats(convertedProducts, transfersData);
        setStats(reportStats);
        
        console.log('✅ Reportes actualizados correctamente');
      } else {
        console.log('ℹ️ No se encontraron productos para reportes');
        setProducts([]);
        setTransfers([]);
        setStats(null);
        console.log('ℹ️ No hay datos disponibles para generar reportes');
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar datos de reportes:', error);
      toast.error(`Error al cargar reportes: ${error.message}`);
      setProducts([]);
      setTransfers([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (products: Product[], transfers: any[] = []): ReportStats => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - parseInt(selectedDateRange));

    // Usar TODOS los productos para las estadísticas principales
    // Solo las transferencias se filtran por fecha
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === ProductStatus.ACTIVE).length;
    const expiredProducts = products.filter(p => {
      const expirationInfo = calculateExpirationInfo(p);
      return expirationInfo.urgencyLevel === 'critical' || new Date(p.expirationDate) < now;
    }).length;
    
    // Solo filtrar transferencias por rango de fecha
    const transferredProducts = transfers.filter(transfer => {
      const transferDate = new Date(transfer.timestamp);
      return transferDate >= cutoffDate;
    }).length;

    // Calcular vida útil promedio de TODOS los productos
    const shelfLives = products.map(p => {
      const production = new Date(p.productionDate);
      const expiration = new Date(p.expirationDate);
      return Math.ceil((expiration.getTime() - production.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgShelfLife = shelfLives.length > 0 ? Math.round(shelfLives.reduce((a, b) => a + b, 0) / shelfLives.length) : 0;

    // Breakdown por categoría de TODOS los productos
    const categoryBreakdown: { [key: string]: number } = {};
    products.forEach(p => {
      const category = p.metadata.category || 'Sin categoría';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    return {
      totalProducts,
      activeProducts,
      expiredProducts,
      transferredProducts,
      avgShelfLife,
      categoryBreakdown
    };
  };

  const exportToCSV = () => {
    if (products.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['ID', 'Nombre', 'Lote', 'Categoría', 'Fecha Producción', 'Fecha Vencimiento', 'Estado', 'Peso', 'Ubicación'];
    const csvData = products.map(product => [
      product.id,
      product.name,
      product.batchNumber,
      product.metadata.category,
      product.productionDate,
      product.expirationDate,
      product.status,
      product.metadata.weight,
      product.currentLocation
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-productos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Reporte exportado exitosamente');
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Reportes - Food Traceability</title>
          <meta name="description" content="Reportes y análisis de producción" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Generando Reportes</h2>
            <p className="text-gray-600">Analizando datos de producción...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reportes - Food Traceability</title>
        <meta name="description" content="Reportes y análisis de producción" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/producer" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>
                    <p className="text-sm text-gray-500">Análisis de producción y estadísticas</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={exportToCSV}
                  disabled={!stats || stats.totalProducts === 0}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Exportar CSV</span>
                </button>
                
                <button
                  onClick={loadReportData}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
                
                <Link href="/producer" className="btn-primary">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb 
                items={[
                  { label: 'Dashboard', href: '/producer' },
                  { label: 'Reportes', current: true }
                ]}
              />
            </div>

            {/* Controls */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Reportes de Producción
                </h2>
                <p className="text-gray-600">
                  Análisis detallado de tus productos y estadísticas de producción
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="input-field"
                  >
                    <option value="7">Últimos 7 días</option>
                    <option value="30">Últimos 30 días</option>
                    <option value="90">Últimos 3 meses</option>
                    <option value="365">Último año</option>
                  </select>
                </div>
              </div>
            </div>

            {stats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Productos</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Productos Activos</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.activeProducts}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Vida Útil Promedio</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.avgShelfLife} días</p>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ChartBarIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Transferidos</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.transferredProducts}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos por Categoría</h3>
                    <div className="space-y-3">
                      {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-gray-700">{category}</span>
                          <span className="font-medium text-gray-900">{count} productos</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Período para transferencias</span>
                        <span className="font-medium text-gray-900">Últimos {selectedDateRange} días</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Productos con problemas</span>
                        <span className="font-medium text-red-600">{stats.expiredProducts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Tasa de productos activos</span>
                        <span className="font-medium text-green-600">
                          {stats.totalProducts > 0 ? Math.round((stats.activeProducts / stats.totalProducts) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Products Table */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Productos Recientes</h3>
                    <Link href="/producer" className="btn-secondary flex items-center space-x-2">
                      <EyeIcon className="w-4 h-4" />
                      <span>Ver Todos</span>
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lote
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Producción
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimiento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.slice(0, 5).map((product) => {
                          const expirationInfo = calculateExpirationInfo(product);
                          return (
                            <tr key={product.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.metadata.category}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {product.batchNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <SafeDate date={product.productionDate} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <SafeDate date={product.expirationDate} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  expirationInfo.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' :
                                  expirationInfo.urgencyLevel === 'warning' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {product.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transfer History */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Historial de Transferencias</h3>
                    <div className="text-sm text-gray-500">
                      Últimas {transfers.length} transferencias
                    </div>
                  </div>

                  {transfers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Destinatario
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notas
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transfers.slice(0, 10).map((transfer, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {transfer.tokenId}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Cantidad: {transfer.amount}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  transfer.transferType === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                  transfer.transferType === 'DISTRIBUTION' ? 'bg-green-100 text-green-800' :
                                  transfer.transferType === 'SALE' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {transfer.transferType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <SafeDate date={transfer.timestamp} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transfer.notes || 'Sin notas'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChartBarIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Sin transferencias</h3>
                      <p className="text-gray-600">
                        No hay transferencias registradas en este período
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                <p className="text-gray-600 mb-4">
                  No tienes productos registrados para generar reportes
                </p>
                <Link href="/producer/create-product" className="btn-primary">
                  Crear Primer Producto
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
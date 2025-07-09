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
  EyeIcon,
  BeakerIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import Breadcrumb from '@/components/Breadcrumb';
import { calculateExpirationInfo } from '@/utils/expirationUtils';

interface ProcessorReportStats {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  transferredProducts: number;
  avgProcessingTime: number;
  qualityMetrics: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
}

export default function ProcessorReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stats, setStats] = useState<ProcessorReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState('30'); // días
  const [selectedReport, setSelectedReport] = useState<'overview' | 'batches' | 'quality' | 'transfers'>('overview');

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
        
        if (storedRole !== UserRole.PROCESSOR) {
          toast.error('Acceso denegado: Se requiere rol de Procesador');
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
      console.log('📊 Cargando datos para reportes de procesamiento...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts, getMyTransfers } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      // Cargar transferencias del usuario autenticado
      const transfersResponse = await getMyTransfers();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos procesados cargados para reportes:', productsResponse.data);
        
        // Convertir FoodAsset[] a Product[] para compatibilidad con la UI
        const convertedProducts = productsResponse.data.map((foodAsset: any) => ({
          id: foodAsset.id,
          name: foodAsset.name,
          batchNumber: foodAsset.batchNumber || foodAsset.attributes?.batchNumber,
          productionDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
          expirationDate: foodAsset.expirationDate || foodAsset.attributes?.expirationDate,
          status: foodAsset.status || ProductStatus.ACTIVE,
          currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Planta de Procesamiento',
          temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 2,
          humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 80,
          producer: {
            id: 'current-processor',
            name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Procesadora Valle Verde',
            location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Zona Industrial, San José'
          },
          metadata: {
            variety: foodAsset.variety || foodAsset.attributes?.variety || 'Procesado',
            weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
            certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'HACCP',
            harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            description: foodAsset.description || foodAsset.attributes?.description || 'Producto procesado',
            brand: foodAsset.brand || foodAsset.attributes?.brand || 'Valle Verde',
            category: foodAsset.category || foodAsset.attributes?.category || 'PROCESSED'
          }
        }));
        
        setProducts(convertedProducts);
        
        // Calcular transferencias reales desde el blockchain
        let actualTransfers = 0;
        let transfersData = [];
        if (transfersResponse.success && transfersResponse.data) {
          actualTransfers = transfersResponse.data.length;
          transfersData = transfersResponse.data;
        }
        
        setTransfers(transfersData);
        
        // Calcular estadísticas de procesamiento
        const reportStats: ProcessorReportStats = {
          totalBatches: convertedProducts.length,
          activeBatches: convertedProducts.filter(p => p.status === ProductStatus.ACTIVE).length,
          completedBatches: convertedProducts.filter(p => p.status === ProductStatus.IN_TRANSIT || p.status === ProductStatus.CONSUMED).length,
          transferredProducts: actualTransfers,
          avgProcessingTime: 2.5, // días promedio de procesamiento
          qualityMetrics: {
            'Temperatura Óptima': Math.round((convertedProducts.filter(p => p.temperature <= 4).length / convertedProducts.length) * 100),
            'Humedad Controlada': Math.round((convertedProducts.filter(p => p.humidity >= 70 && p.humidity <= 85).length / convertedProducts.length) * 100),
            'Certificación HACCP': Math.round((convertedProducts.filter(p => p.metadata.certification?.includes('HACCP')).length / convertedProducts.length) * 100),
            'Trazabilidad Completa': Math.round((convertedProducts.filter(p => p.metadata.harvestDate).length / convertedProducts.length) * 100)
          },
          categoryBreakdown: convertedProducts.reduce((acc, product) => {
            const category = product.metadata.category || 'Sin categoría';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number })
        };
        
        setStats(reportStats);
        
        console.log('📊 Estadísticas de procesamiento calculadas:', reportStats);
      } else {
        console.log('ℹ️ No se encontraron productos procesados');
        setProducts([]);
        setStats(null);
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar datos de reporte:', error);
      toast.error(`Error al cargar reportes: ${error.message}`);
      setProducts([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!stats || products.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: `${selectedDateRange} días`,
      stats,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        batchNumber: p.batchNumber,
        status: p.status,
        productionDate: p.productionDate,
        expirationDate: p.expirationDate,
        category: p.metadata.category,
        certification: p.metadata.certification
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-procesamiento-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Reporte exportado exitosamente');
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Reportes de Procesamiento - Food Traceability</title>
          <meta name="description" content="Reportes y estadísticas de productos procesados" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Generando Reportes</h2>
            <p className="text-gray-600">Analizando datos de procesamiento...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reportes de Procesamiento - Food Traceability</title>
        <meta name="description" content="Reportes y estadísticas de productos procesados" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/processor" className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Reportes de Procesamiento</h1>
                    <p className="text-sm text-gray-500">Estadísticas y análisis de productos procesados</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={exportReport}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
                
                <Link href="/processor" className="btn-primary">
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
                  { label: 'Dashboard', href: '/processor' },
                  { label: 'Reportes', current: true }
                ]}
              />
            </div>

            {/* Controls */}
            <div className="card mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Período</label>
                    <select
                      value={selectedDateRange}
                      onChange={(e) => setSelectedDateRange(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="7">Últimos 7 días</option>
                      <option value="30">Últimos 30 días</option>
                      <option value="90">Últimos 90 días</option>
                      <option value="365">Último año</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Tipo de Reporte</label>
                    <select
                      value={selectedReport}
                      onChange={(e) => setSelectedReport(e.target.value as any)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="overview">Resumen General</option>
                      <option value="batches">Lotes Procesados</option>
                      <option value="quality">Métricas de Calidad</option>
                      <option value="transfers">Transferencias</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={loadReportData}
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar Datos'}
                </button>
              </div>
            </div>

            {stats && (
              <>
                {/* Overview Stats */}
                {selectedReport === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="card">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <BeakerIcon className="h-8 w-8 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-500">Total Lotes</div>
                          <div className="text-2xl font-semibold text-gray-900">{stats.totalBatches}</div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-500">Lotes Activos</div>
                          <div className="text-2xl font-semibold text-gray-900">{stats.activeBatches}</div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-500">Tiempo Procesamiento</div>
                          <div className="text-2xl font-semibold text-gray-900">{stats.avgProcessingTime} días</div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-500">Transferidos</div>
                          <div className="text-2xl font-semibold text-gray-900">{stats.transferredProducts}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quality Metrics */}
                {(selectedReport === 'overview' || selectedReport === 'quality') && (
                  <div className="card mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Métricas de Calidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Object.entries(stats.qualityMetrics).map(([metric, value]) => (
                        <div key={metric} className="text-center">
                          <div className="text-3xl font-bold text-purple-600">{value}%</div>
                          <div className="text-sm text-gray-600">{metric}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Breakdown */}
                {(selectedReport === 'overview' || selectedReport === 'batches') && (
                  <div className="card mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Categoría</h3>
                    <div className="space-y-4">
                      {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-purple-500 rounded"></div>
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">{count} lotes</span>
                            <span className="text-sm text-gray-500">
                              ({Math.round((count / stats.totalBatches) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Table */}
                {selectedReport === 'batches' && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Lotes Procesados</h3>
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
                              Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vencimiento
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Certificación
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.map((product) => {
                            const expirationInfo = calculateExpirationInfo(product);
                            return (
                              <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <BeakerIcon className="w-5 h-5 text-purple-500 mr-2" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                      <div className="text-sm text-gray-500">{product.metadata.category}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {product.batchNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    product.status === ProductStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                                    product.status === ProductStatus.IN_TRANSIT ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {product.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <SafeDate date={product.expirationDate} />
                                  {expirationInfo.urgencyLevel === 'warning' && (
                                    <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 inline ml-1" />
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {product.metadata.certification}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Transfers Table */}
                {selectedReport === 'transfers' && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Transferencias</h3>
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
                              Cantidad
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
                          {transfers.map((transfer, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <BeakerIcon className="w-5 h-5 text-purple-500 mr-2" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{transfer.tokenId}</div>
                                    <div className="text-sm text-gray-500">{transfer.transferType}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="font-mono text-xs">
                                  {transfer.to.substring(0, 6)}...{transfer.to.substring(transfer.to.length - 4)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {transfer.amount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
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
                    
                    {transfers.length === 0 && (
                      <div className="text-center py-8">
                        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transferencias registradas</h3>
                        <p className="text-gray-600">Aún no has transferido ningún producto procesado.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!stats && !isLoading && (
              <div className="card text-center py-12">
                <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                <p className="text-gray-600 mb-4">
                  No se encontraron productos procesados para generar reportes.
                </p>
                <Link href="/processor" className="btn-primary">
                  Volver al Dashboard
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
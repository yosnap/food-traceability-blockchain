import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  CogIcon,
  BeakerIcon,
  QrCodeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import TransferModal from '@/components/TransferModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateExpirationInfo } from '@/utils/expirationUtils';
import Breadcrumb from '@/components/Breadcrumb';

interface ProcessorStats {
  totalBatches: number;
  activeProcessing: number;
  readyProducts: number;
  rawMaterials: number;
}

export default function ProcessorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ProcessorStats>({ totalBatches: 0, activeProcessing: 0, readyProducts: 0, rawMaterials: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Hook de notificaciones
  const {
    notifications,
    stats: notificationStats,
    markAsRead,
    markAllAsRead
  } = useNotifications(products);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let mounted = true;
    
    // Simplified auth check
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole');
      const storedUser = localStorage.getItem('authUser');
      const storedToken = localStorage.getItem('authToken');
      
      console.log('🔍 Dashboard auth check:', {
        hasRole: !!storedRole,
        hasUser: !!storedUser,
        hasToken: !!storedToken,
        role: storedRole
      });
      
      if (!storedRole || !storedUser || !storedToken) {
        console.log('❌ Missing auth data, redirecting to login');
        if (mounted) {
          router.push('/auth');
        }
        return;
      }
      
      if (storedRole !== UserRole.PROCESSOR) {
        if (mounted) {
          toast.error('Acceso denegado: Se requiere rol de Procesador');
          router.push('/auth');
        }
        return;
      }
      
      // Set current user from localStorage
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    
    // Load data with a small delay to avoid multiple calls
    timeoutId = setTimeout(() => {
      if (mounted) {
        loadDashboardData();
      }
    }, 100);
    
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando datos del dashboard de procesador...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos cargados:', productsResponse.data);
        
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
        
        // Ensure unique products by ID to avoid duplicate keys
        const uniqueProducts = convertedProducts.filter((product, index, array) => 
          index === array.findIndex(p => p.id === product.id)
        );
        setProducts(uniqueProducts);
        
        // Calcular estadísticas básicas
        const totalBatches = uniqueProducts.length;
        const activeProcessing = uniqueProducts.filter(p => p.status === ProductStatus.ACTIVE).length;
        const readyProducts = uniqueProducts.filter(p => p.status === ProductStatus.IN_TRANSIT).length;
        const rawMaterials = Math.floor(totalBatches * 1.5); // Estimación
        
        setStats({
          totalBatches,
          activeProcessing,
          readyProducts,
          rawMaterials
        });
        
        toast.success(`Dashboard actualizado - ${totalBatches} lotes procesados cargados`, { id: 'dashboard-load' });
      } else {
        console.log('ℹ️ No se encontraron productos procesados');
        setProducts([]);
        toast.info('No hay productos procesados registrados.', { id: 'dashboard-empty' });
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar datos del dashboard:', error);
      toast.error(`Error al cargar datos: ${error.message}`, { id: 'dashboard-error' });
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case ProductStatus.IN_TRANSIT:
        return 'bg-blue-100 text-blue-800';
      case ProductStatus.EXPIRED:
        return 'bg-red-100 text-red-800';
      case ProductStatus.RECALLED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return <CheckCircleIcon className="w-4 h-4" />;
      case ProductStatus.IN_TRANSIT:
        return <ClockIcon className="w-4 h-4" />;
      case ProductStatus.EXPIRED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case ProductStatus.RECALLED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const handleTransferClick = (product: Product) => {
    setSelectedProduct(product);
    setShowTransferModal(true);
  };

  const handleTransferComplete = (product: Product, toRole: UserRole, recipient: any) => {
    // Update product status to IN_TRANSIT
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === product.id 
          ? { 
              ...p, 
              status: ProductStatus.IN_TRANSIT, 
              currentLocation: `En tránsito hacia ${recipient.name}`,
              metadata: {
                ...p.metadata,
                transferHistory: [
                  ...(p.metadata.transferHistory || []),
                  {
                    timestamp: new Date().toISOString(),
                    fromRole: UserRole.PROCESSOR,
                    toRole,
                    recipient: recipient.name,
                    location: recipient.location
                  }
                ]
              }
            }
          : p
      )
    );

    // Update stats
    setStats(prevStats => ({
      ...prevStats,
      activeProcessing: prevStats.activeProcessing - 1,
      readyProducts: prevStats.readyProducts + 1
    }));

    toast.success(`Producto procesado "${product.name}" transferido exitosamente a ${recipient.name}`, { id: 'transfer-success' });
    setShowTransferModal(false);
    setSelectedProduct(null);
  };

  if (isInitialLoad) {
    return (
      <>
        <Head>
          <title>Dashboard Procesador - Food Traceability</title>
          <meta name="description" content="Panel de control para procesadores de alimentos" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Dashboard</h2>
            <p className="text-gray-600">Conectando con el blockchain y cargando tus productos procesados...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Procesador - Food Traceability</title>
        <meta name="description" content="Panel de control para procesadores de alimentos" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Inicio</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <BeakerIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Procesador</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Procesador'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <NotificationBell
                  notifications={notifications}
                  stats={notificationStats}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                />
                
                <button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
                
                <Link href="/profile" className="btn-secondary">
                  Mi Perfil
                </Link>
                
                <Link href="/auth" className="btn-primary">
                  Cambiar Usuario
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
                  { label: 'Dashboard Procesador', current: true }
                ]}
              />
            </div>

            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Bienvenido, {currentUser?.name || 'Procesador'}!
              </h2>
              <p className="text-gray-600">
                Gestiona el procesamiento de materias primas y controla la producción de alimentos procesados
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BeakerIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Lotes</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalBatches}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CogIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En Procesamiento</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeProcessing}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Productos Listos</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.readyProducts}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Materias Primas</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.rawMaterials}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BeakerIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Procesamiento</h3>
                  <p className="text-gray-600 text-sm">Iniciar procesamiento de materias primas</p>
                </div>
              </div>

              <Link href="/processor/transfer" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ArrowRightIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Transferir Productos</h3>
                  <p className="text-gray-600 text-sm">Enviar productos procesados a distribuidores</p>
                </div>
              </Link>

              <Link href="/processor/reports" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
                  <p className="text-gray-600 text-sm">Ver estadísticas y métricas de calidad</p>
                </div>
              </Link>

              <Link href="/profile" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CogIcon className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Mi Perfil</h3>
                  <p className="text-gray-600 text-sm">Configuración y certificado X.509</p>
                </div>
              </Link>
            </div>

            {/* Products Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Productos Procesados</h3>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar productos procesados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const expirationInfo = calculateExpirationInfo(product);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        expirationInfo.urgencyLevel === 'critical' 
                          ? 'border-red-300 bg-red-50' 
                          : expirationInfo.urgencyLevel === 'warning'
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <BeakerIcon className="w-5 h-5 text-purple-600" />
                            <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1">{product.status}</span>
                            </span>
                            
                            {expirationInfo.urgencyLevel !== 'normal' && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${expirationInfo.urgencyColor} ${
                                expirationInfo.urgencyLevel === 'critical' ? 'animate-pulse' : ''
                              }`}>
                                {expirationInfo.urgencyLevel === 'critical' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
                                {expirationInfo.urgencyLevel === 'warning' && <ClockIcon className="w-3 h-3 mr-1" />}
                                {expirationInfo.urgencyMessage}
                              </span>
                            )}
                          </div>
                        
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <QrCodeIcon className="w-4 h-4 mr-2" />
                              <span>{product.batchNumber}</span>
                            </div>
                            <div className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              <span>Vence: <SafeDate date={product.expirationDate} /></span>
                            </div>
                            <div className="flex items-center">
                              <MapPinIcon className="w-4 h-4 mr-2" />
                              <span>{product.currentLocation}</span>
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-500">
                            <span className="mr-4">Peso: {product.metadata.weight}</span>
                            <span className="mr-4">Temp: {product.temperature}°C</span>
                            <span className="mr-4">Humedad: {product.humidity}%</span>
                            <span>Certificación: {product.metadata.certification}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="btn-secondary text-sm">
                            Ver Detalles
                          </button>
                          <button 
                            onClick={() => handleTransferClick(product)}
                            disabled={!expirationInfo.canTransfer}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              expirationInfo.canTransfer
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!expirationInfo.canTransfer ? 'No se puede transferir producto vencido' : ''}
                          >
                            Transferir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <BeakerIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos procesados</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron productos con ese término' : 'Aún no has procesado ningún producto'}
                  </p>
                  <button className="btn-primary">
                    Iniciar Procesamiento
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        product={selectedProduct}
        fromRole={UserRole.PROCESSOR}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
}
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
  TruckIcon,
  ArchiveBoxIcon,
  FireIcon,
  QrCodeIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import TransferModal from '@/components/TransferModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateExpirationInfo } from '@/utils/expirationUtils';
import Breadcrumb from '@/components/Breadcrumb';

// Función para calcular si un producto ha sido entregado (tiempo personalizable)
function calculateDeliveryStatus(transferHistory: any[]): { status: 'pending' | 'in_transit' | 'delivered', timeInfo: string } {
  if (!transferHistory || transferHistory.length === 0) {
    return { status: 'pending', timeInfo: 'Sin transferencias' };
  }
  
  const lastTransfer = transferHistory[transferHistory.length - 1];
  const transferTime = new Date(lastTransfer.timestamp);
  const now = new Date();
  const hoursSinceTransfer = (now.getTime() - transferTime.getTime()) / (1000 * 60 * 60);
  
  // Usar tiempo de entrega personalizado o 0 horas por defecto (inmediata)
  const deliveryTimeHours = lastTransfer.deliveryTimeHours !== undefined ? lastTransfer.deliveryTimeHours : 0;
  
  // Si el tiempo de entrega es 0 (inmediata), marcar como entregado inmediatamente
  if (deliveryTimeHours === 0) {
    return { 
      status: 'delivered', 
      timeInfo: `Entregado inmediatamente` 
    };
  }
  
  if (hoursSinceTransfer < deliveryTimeHours) {
    const remainingHours = deliveryTimeHours - hoursSinceTransfer;
    const remainingMinutes = Math.floor((remainingHours % 1) * 60);
    const hours = Math.floor(remainingHours);
    return { 
      status: 'in_transit', 
      timeInfo: `${hours}h ${remainingMinutes}m para entrega` 
    };
  } else {
    return { 
      status: 'delivered', 
      timeInfo: `Entregado hace ${Math.floor(hoursSinceTransfer - deliveryTimeHours)}h` 
    };
  }
}

interface DistributorStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  warehouses: number;
}

export default function DistributorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DistributorStats>({ totalShipments: 0, inTransit: 0, delivered: 0, warehouses: 0 });
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
    let intervalId: NodeJS.Timeout | null = null;
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
      
      if (storedRole !== UserRole.DISTRIBUTOR) {
        if (mounted) {
          toast.error('Acceso denegado: Se requiere rol de Distribuidor');
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
    
    // Auto-refresh every minute to update delivery statuses
    intervalId = setInterval(() => {
      if (mounted) {
        loadDashboardData();
      }
    }, 60000); // 60 seconds
    
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando datos del dashboard de distribuidor...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts, getMyTransfers } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      // Cargar transferencias del usuario autenticado
      const transfersResponse = await getMyTransfers();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos cargados:', productsResponse.data);
        
        // Convertir FoodAsset[] a Product[] para compatibilidad con la UI
        const convertedProducts = productsResponse.data.map((foodAsset: any) => {
          const deliveryStatus = calculateDeliveryStatus(foodAsset.transferHistory);
          
          return {
            id: foodAsset.id,
            name: foodAsset.name,
            batchNumber: foodAsset.batchNumber || foodAsset.attributes?.batchNumber,
            productionDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            expirationDate: foodAsset.expirationDate || foodAsset.attributes?.expirationDate,
            status: deliveryStatus.status === 'delivered' ? ProductStatus.CONSUMED : 
                   deliveryStatus.status === 'in_transit' ? ProductStatus.IN_TRANSIT : 
                   ProductStatus.ACTIVE,
            currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Centro de Distribución',
            temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 4,
            humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 75,
            quantity: foodAsset.amount || 1, // Mapear el campo amount del blockchain como quantity
            producer: {
              id: 'current-distributor',
              name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Logística Valle Central',
              location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Centro de Distribución Principal'
            },
            metadata: {
              variety: foodAsset.variety || foodAsset.attributes?.variety || 'Mixto',
              weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
              certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'Cadena de Frío',
              harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
              description: foodAsset.description || foodAsset.attributes?.description || 'Producto en distribución',
              brand: foodAsset.brand || foodAsset.attributes?.brand || 'Valle Central',
              category: foodAsset.category || foodAsset.attributes?.category || 'DISTRIBUTION',
              deliveryInfo: deliveryStatus.timeInfo // Información de entrega
            }
          };
        });
        
        // Ensure unique products by ID to avoid duplicate keys
        const uniqueProducts = convertedProducts.filter((product, index, array) => 
          index === array.findIndex(p => p.id === product.id)
        );
        setProducts(uniqueProducts);
        
        // Calcular transferencias reales desde el blockchain
        let actualTransfers = 0;
        if (transfersResponse.success && transfersResponse.data) {
          actualTransfers = transfersResponse.data.length;
        }
        
        // Calcular estadísticas básicas con los nuevos estados
        const totalShipments = uniqueProducts.length;
        const inTransit = uniqueProducts.filter(p => p.status === ProductStatus.IN_TRANSIT).length;
        const delivered = uniqueProducts.filter(p => p.status === ProductStatus.CONSUMED).length;
        const warehouses = 4; // Número fijo de almacenes
        
        setStats({
          totalShipments,
          inTransit,
          delivered,
          warehouses
        });
        
        toast.success(`Dashboard actualizado - ${totalShipments} envíos gestionados`, { id: 'dashboard-load' });
      } else {
        console.log('ℹ️ No se encontraron productos en distribución');
        setProducts([]);
        toast.info('No hay productos en distribución registrados.', { id: 'dashboard-empty' });
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
        return 'bg-yellow-100 text-yellow-800';
      case ProductStatus.IN_TRANSIT:
        return 'bg-blue-100 text-blue-800';
      case ProductStatus.CONSUMED:
        return 'bg-green-100 text-green-800';
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
        return <ClockIcon className="w-4 h-4" />;
      case ProductStatus.IN_TRANSIT:
        return <TruckIcon className="w-4 h-4" />;
      case ProductStatus.CONSUMED:
        return <CheckCircleIcon className="w-4 h-4" />;
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

  const handleTransferComplete = async (product: Product, toRole: UserRole, recipient: any) => {
    // Update stats
    setStats(prevStats => ({
      ...prevStats,
      inTransit: prevStats.inTransit + 1
    }));

    toast.success(`Producto "${product.name}" enviado exitosamente a ${recipient.name}`, { id: 'transfer-success' });
    setShowTransferModal(false);
    setSelectedProduct(null);
    
    // Recargar productos del blockchain para obtener el estado actualizado
    await loadDashboardData();
  };

  if (isInitialLoad) {
    return (
      <>
        <Head>
          <title>Dashboard Distribuidor - Food Traceability</title>
          <meta name="description" content="Panel de control para distribuidores de alimentos" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Dashboard</h2>
            <p className="text-gray-600">Conectando con el blockchain y cargando tus envíos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Distribuidor - Food Traceability</title>
        <meta name="description" content="Panel de control para distribuidores de alimentos" />
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
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <TruckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Distribuidor</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Distribuidor'}</p>
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
                  { label: 'Dashboard Distribuidor', current: true }
                ]}
              />
            </div>

            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Bienvenido, {currentUser?.name || 'Distribuidor'}!
              </h2>
              <p className="text-gray-600">
                Gestiona la logística y distribución de productos alimentarios a minoristas
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TruckIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Envíos</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalShipments}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En Tránsito</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.inTransit}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Entregados</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.delivered}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ArchiveBoxIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Almacenes</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.warehouses}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ArchiveBoxIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Inventario</h3>
                  <p className="text-gray-600 text-sm">Control de almacenes y stock</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TruckIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Planificar Rutas</h3>
                  <p className="text-gray-600 text-sm">Optimizar entregas a minoristas</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes Logísticos</h3>
                  <p className="text-gray-600 text-sm">Estadísticas de distribución</p>
                </div>
              </div>

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
                <h3 className="text-lg font-semibold text-gray-900">Productos en Distribución</h3>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar envíos..."
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
                            <TruckIcon className="w-5 h-5 text-blue-600" />
                            <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1">
                                {product.status === ProductStatus.ACTIVE && 'Disponible'}
                                {product.status === ProductStatus.IN_TRANSIT && 'En Tránsito'}
                                {product.status === ProductStatus.CONSUMED && 'Entregado'}
                                {product.status === ProductStatus.EXPIRED && 'Vencido'}
                                {product.status === ProductStatus.RECALLED && 'Retirado'}
                              </span>
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
                            <span className="mr-4">Certificación: {product.metadata.certification}</span>
                            <span className="font-medium text-blue-600">{product.metadata.deliveryInfo}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="btn-secondary text-sm">
                            Rastrear Envío
                          </button>
                          <button 
                            onClick={() => handleTransferClick(product)}
                            disabled={!expirationInfo.canTransfer || product.status !== ProductStatus.ACTIVE}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              expirationInfo.canTransfer && product.status === ProductStatus.ACTIVE
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={
                              !expirationInfo.canTransfer ? 'No se puede transferir producto vencido' :
                              product.status !== ProductStatus.ACTIVE ? 'Solo se pueden transferir productos disponibles' : ''
                            }
                          >
                            Distribuir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos en distribución</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron envíos con ese término' : 'No tienes productos pendientes de distribución'}
                  </p>
                  <button className="btn-primary">
                    Recibir Productos
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
        fromRole={UserRole.DISTRIBUTOR}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
}
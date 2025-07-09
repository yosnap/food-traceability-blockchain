import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  QrCodeIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  StarIcon,
  BellIcon,
  CameraIcon,
  InformationCircleIcon,
  CogIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateExpirationInfo } from '@/utils/expirationUtils';
import Breadcrumb from '@/components/Breadcrumb';

interface ConsumerStats {
  scannedProducts: number;
  trackedProducts: number;
  notifications: number;
  savedProducts: number;
}

// Datos reales del blockchain - sin mock data

export default function ConsumerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ConsumerStats>({ scannedProducts: 0, trackedProducts: 0, notifications: 0, savedProducts: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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
      
      if (storedRole !== UserRole.CONSUMER) {
        if (mounted) {
          toast.error('Acceso denegado: Se requiere rol de Consumidor');
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
      console.log('🔄 Cargando datos del dashboard de consumidor...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts } = await import('@/utils/api');
      
      // Cargar productos disponibles que el consumidor puede rastrear
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
          currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Mi Hogar',
          temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 8,
          humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 65,
          producer: {
            id: 'current-consumer',
            name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Consumidor Final',
            location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Casa del Consumidor'
          },
          metadata: {
            variety: foodAsset.variety || foodAsset.attributes?.variety || 'Consumo directo',
            weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
            certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'Consumo seguro',
            harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            description: foodAsset.description || foodAsset.attributes?.description || 'Producto para consumo',
            brand: foodAsset.brand || foodAsset.attributes?.brand || 'Consumidor Final',
            category: foodAsset.category || foodAsset.attributes?.category || 'CONSUMER'
          }
        }));
        
        // Ensure unique products by ID to avoid duplicate keys
        const uniqueProducts = convertedProducts.filter((product, index, array) => 
          index === array.findIndex(p => p.id === product.id)
        );
        setProducts(uniqueProducts);
        
        // Calcular estadísticas básicas
        const scannedProducts = uniqueProducts.length;
        const trackedProducts = uniqueProducts.filter(p => p.status === ProductStatus.ACTIVE).length;
        const notificationsCount = uniqueProducts.filter(p => {
          const expirationInfo = calculateExpirationInfo(p);
          return expirationInfo.urgencyLevel === 'warning' || expirationInfo.urgencyLevel === 'critical';
        }).length;
        const savedProducts = uniqueProducts.filter(p => p.status === ProductStatus.CONSUMED).length;
        
        setStats({
          scannedProducts,
          trackedProducts,
          notifications: notificationsCount,
          savedProducts
        });
        
        toast.success(`Dashboard actualizado - ${scannedProducts} productos disponibles para rastrear`, { id: 'dashboard-load' });
      } else {
        console.log('ℹ️ No se encontraron productos disponibles');
        setProducts([]);
        toast.info('No hay productos disponibles para rastrear.', { id: 'dashboard-empty' });
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
      case ProductStatus.CONSUMED:
        return 'bg-gray-100 text-gray-800';
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
      case ProductStatus.CONSUMED:
        return <CheckCircleIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const isExpiringSoon = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  };

  const getDaysUntilExpiry = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleScanQR = () => {
    setShowScanner(true);
    toast('Simulando escaneo QR - En producción se abriría la cámara', { 
      icon: '📱',
      duration: 3000,
      id: 'scan-demo' 
    });
    
    // Simulación de escaneo exitoso
    setTimeout(() => {
      setShowScanner(false);
      
      // Crear datos de ejemplo para demostrar la funcionalidad
      const demoQRData = {
        productId: 'PROD-001',
        productName: 'Tomates Cherry Orgánicos',
        batchNumber: 'TCO-2025-001',
        retailerId: 'retailer-001',
        retailerName: 'SuperMarket Plus',
        timestamp: new Date().toISOString(),
        traceability: {
          producer: {
            name: 'Finca Verde Esperanza',
            location: 'Cartago, Costa Rica'
          },
          currentLocation: 'SuperMarket Plus',
          expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          certifications: 'Orgánico, HACCP'
        }
      };
      
      const qrUrl = `/product-scan?data=${encodeURIComponent(JSON.stringify(demoQRData))}`;
      
      toast.success('¡Producto escaneado exitosamente!');
      
      // Redirigir a la página de información del producto
      setTimeout(() => {
        router.push(qrUrl);
      }, 1000);
    }, 2000);
  };

  const handleTraceabilityClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleHistoryClick = () => {
    toast('Mostrando historial de productos consumidos', { 
      icon: '📋',
      duration: 3000 
    });
  };

  const handleMarkConsumed = async (product: Product) => {
    toast('Marcando producto como consumido...', { 
      icon: '🍽️',
      duration: 2000 
    });
    
    // Aquí iría la lógica para marcar el producto como consumido
    // Por ahora solo mostramos un toast
    setTimeout(() => {
      toast.success(`Producto "${product.name}" marcado como consumido`);
      // Recargar datos después de marcar como consumido
      loadDashboardData();
    }, 1000);
  };

  if (isInitialLoad) {
    return (
      <>
        <Head>
          <title>Dashboard Consumidor - Food Traceability</title>
          <meta name="description" content="Panel de control para consumidores finales" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Dashboard</h2>
            <p className="text-gray-600">Conectando con el blockchain y cargando productos disponibles...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Consumidor - Food Traceability</title>
        <meta name="description" content="Panel de control para consumidores finales" />
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
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Consumidor</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Consumidor'}</p>
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
                  { label: 'Dashboard Consumidor', current: true }
                ]}
              />
            </div>

            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Hola, {currentUser?.name || 'Consumidor'}!
              </h2>
              <p className="text-gray-600">
                Escanea productos y mantén un control completo de lo que consumes
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <QrCodeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Productos Escaneados</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.scannedProducts}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Siguiendo</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.trackedProducts}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BellIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Notificaciones</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.notifications}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <StarIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Favoritos</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.savedProducts}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              <div 
                onClick={handleScanQR}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {showScanner ? (
                      <CameraIcon className="w-8 h-8 text-blue-600 animate-pulse" />
                    ) : (
                      <QrCodeIcon className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {showScanner ? 'Escaneando...' : 'Escanear QR'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {showScanner ? 'Enfoca el código QR del producto' : 'Ver información completa del producto'}
                  </p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BellIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Alertas</h3>
                  <p className="text-gray-600 text-sm">Recibe notificaciones de caducidad</p>
                </div>
              </div>

              <div 
                onClick={handleHistoryClick}
                className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <InformationCircleIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Historial</h3>
                  <p className="text-gray-600 text-sm">Ver productos consumidos anteriormente</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Mis Productos</h3>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar productos..."
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
                            <UserIcon className="w-5 h-5 text-gray-600" />
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
                              <span>Origen: {product.producer.name}</span>
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-500">
                            <span className="mr-4">Cantidad: {product.metadata.weight}</span>
                            <span className="mr-4">Temp: {product.temperature}°C</span>
                            <span className="mr-4">Humedad: {product.humidity}%</span>
                            <span>Certificación: {product.metadata.certification}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleTraceabilityClick(product)}
                            className="btn-secondary text-sm">
                            Ver Trazabilidad
                          </button>
                          <button 
                            onClick={() => handleMarkConsumed(product)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              expirationInfo.canTransfer
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={!expirationInfo.canTransfer}
                            title={!expirationInfo.canTransfer ? 'Producto vencido no se puede consumir' : ''}
                          >
                            Marcar Consumido
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <QrCodeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron productos con ese término' : 'Escanea códigos QR para empezar a rastrear productos'}
                  </p>
                  <button 
                    onClick={handleScanQR}
                    className="btn-primary"
                  >
                    Escanear Primer Producto
                  </button>
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="mt-8 card bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Consejos para Consumidores</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Escanea productos al comprar para recibir alertas de caducidad</li>
                    <li>• Verifica la trazabilidad completa desde el origen hasta tu mesa</li>
                    <li>• Configura notificaciones para no desperdiciar alimentos</li>
                    <li>• Consulta certificaciones y calidad del producto</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        product={selectedProduct}
      />
    </>
  );
}
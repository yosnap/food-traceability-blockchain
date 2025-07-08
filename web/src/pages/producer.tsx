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
  QrCodeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import TransferModal from '@/components/TransferModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateExpirationInfo } from '@/utils/expirationUtils';
import Breadcrumb from '@/components/Breadcrumb';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  expiringSoon: number;
  transfers: number;
}

const mockStats: DashboardStats = {
  totalProducts: 45,
  activeProducts: 32,
  expiringSoon: 8,
  transfers: 156
};

// Datos reales del blockchain - sin mock data

export default function ProducerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ totalProducts: 0, activeProducts: 0, expiringSoon: 0, transfers: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  
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
      
      if (storedRole !== UserRole.PRODUCER) {
        if (mounted) {
          toast.error('Acceso denegado: Se requiere rol de Productor');
          router.push('/auth');
        }
        return;
      }
      
      // Set current user from localStorage
      try {
        const parsedUser = JSON.parse(storedUser);
        if (mounted) {
          setCurrentUser(parsedUser);
          console.log('✅ Usuario cargado desde localStorage:', parsedUser);
          
          // Solo cargar datos después de confirmar autenticación
          timeoutId = setTimeout(() => {
            if (mounted) {
              console.log('⏰ Cargando datos del dashboard después de autenticación...');
              loadDashboardData();
            }
          }, 100); // Pequeño delay para asegurar que el token esté disponible
        }
      } catch (error) {
        console.error('Error parsing user:', error);
        if (mounted) {
          router.push('/auth');
        }
      }
    }
    
    // Cleanup function para evitar duplicados
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
      console.log('🔄 Cargando productos del usuario...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts, getUserStats } = await import('@/utils/api');
      
      // Cargar productos del usuario autenticado
      const productsResponse = await getMyProducts();
      
      if (productsResponse.success && productsResponse.data) {
        console.log('✅ Productos cargados desde blockchain:', productsResponse.data);
        
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
        
        // Calcular estadísticas básicas
        const totalProducts = convertedProducts.length;
        const activeProducts = convertedProducts.filter(p => p.status === ProductStatus.ACTIVE).length;
        const expiringSoon = convertedProducts.filter(p => isExpiringSoon(p.expirationDate)).length;
        
        setStats({
          totalProducts,
          activeProducts,
          expiringSoon,
          transfers: 0 // Por ahora 0
        });
        
        toast.success(`Dashboard actualizado - ${totalProducts} productos cargados`);
      } else {
        console.log('ℹ️ No se encontraron productos');
        // Mantener arrays vacíos si no hay productos reales
        setProducts([]);
        toast.info('No hay productos registrados. Crea tu primer producto.');
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar datos del dashboard:', error);
      toast.error(`Error al cargar datos: ${error.message}`);
      
      // Mantener arrays vacíos en caso de error
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

  const isExpiringSoon = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
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
                    fromRole: UserRole.PRODUCER,
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
      transfers: prevStats.transfers + 1
    }));
  };

  const handleGenerateQR = (product: Product) => {
    try {
      console.log(`📱 Generando código QR para producto: ${product.id}`);
      
      // Create QR data with product information
      const qrData = {
        productId: product.id,
        name: product.name,
        batchNumber: product.batchNumber,
        productionDate: product.productionDate,
        expirationDate: product.expirationDate,
        producer: product.producer.name,
        verifyUrl: `${window.location.origin}/verify/${product.id}`
      };

      // For now, create a simple QR code data string
      const qrCodeData = `FOOD_TRACE:${JSON.stringify(qrData)}`;
      setQrCode(qrCodeData);
      setSelectedProduct(product);
      setShowQRModal(true);
      
      toast.success('Código QR generado exitosamente');
    } catch (error: any) {
      console.error('❌ Error generando QR:', error);
      toast.error('Error al generar código QR');
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleUpdateProduct = async (updatedData: any) => {
    setIsUpdating(true);
    try {
      console.log(`📝 Actualizando producto: ${selectedProduct?.id}`, updatedData);
      
      // For now, we'll simulate an update by modifying local state
      // In a real implementation, this would call an API endpoint
      if (selectedProduct) {
        const updatedProducts = products.map(p => 
          p.id === selectedProduct.id 
            ? {
                ...p,
                name: updatedData.name || p.name,
                metadata: {
                  ...p.metadata,
                  description: updatedData.description || p.metadata.description,
                  weight: updatedData.weight ? `${updatedData.weight}kg` : p.metadata.weight,
                  brand: updatedData.brand || p.metadata.brand,
                },
                temperature: updatedData.storageConditions?.temperature || p.temperature,
                humidity: updatedData.storageConditions?.humidity || p.humidity,
              }
            : p
        );
        
        setProducts(updatedProducts);
        setShowEditModal(false);
        setSelectedProduct(null);
        toast.success('Producto actualizado exitosamente');
      }
    } catch (error: any) {
      console.error('❌ Error actualizando producto:', error);
      toast.error('Error al actualizar producto');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsUpdating(true);
    try {
      console.log(`🗑️ Marcando producto como inactivo: ${selectedProduct?.id}`);
      
      // In a real implementation, this would mark the product as inactive
      // rather than actually deleting it from the blockchain
      const updatedProducts = products.filter(p => p.id !== selectedProduct?.id);
      setProducts(updatedProducts);
      
      toast.success('Producto marcado como inactivo');
      setShowDeleteModal(false);
      setSelectedProduct(null);
      
    } catch (error: any) {
      console.error('❌ Error desactivando producto:', error);
      toast.error('Error al desactivar producto');
    } finally {
      setIsUpdating(false);
    }
  };

  // Mostrar preloader durante la carga inicial
  if (isInitialLoad) {
    return (
      <>
        <Head>
          <title>Dashboard Productor - Food Traceability</title>
          <meta name="description" content="Panel de control para productores agrícolas" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Dashboard</h2>
            <p className="text-gray-600">Conectando con el blockchain y cargando tus productos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Productor - Food Traceability</title>
        <meta name="description" content="Panel de control para productores agrícolas" />
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
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">🌱</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Productor</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Productor'}</p>
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
                  { label: 'Dashboard Productor', current: true }
                ]}
              />
            </div>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Bienvenido, {currentUser?.name || 'Productor'}!
              </h2>
              <p className="text-gray-600">
                Gestiona tus productos agrícolas y mantén un control completo de la trazabilidad
              </p>
            </div>

            {/* Stats Cards */}
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
                    <p className="text-sm font-medium text-gray-600">Activos</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeProducts}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Próximos a Vencer</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.expiringSoon}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ArrowRightIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Transferencias</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.transfers}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Link href="/producer/create-product" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <PlusIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Producto</h3>
                  <p className="text-gray-600 text-sm">Registra un nuevo lote de productos</p>
                </div>
              </Link>

              <Link href="/producer/transfer" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ArrowRightIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Transferir Productos</h3>
                  <p className="text-gray-600 text-sm">Envía productos a procesadores</p>
                </div>
              </Link>

              <Link href="/producer/reports" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
                  <p className="text-gray-600 text-sm">Genera reportes de producción</p>
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
                  const needsUrgentAttention = ['critical', 'warning'].includes(expirationInfo.urgencyLevel);
                  
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
                            <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1">{product.status}</span>
                            </span>
                            
                            {/* Indicador de caducidad mejorado */}
                            {expirationInfo.urgencyLevel !== 'normal' && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${expirationInfo.urgencyColor} ${
                                expirationInfo.urgencyLevel === 'critical' ? 'animate-pulse' : ''
                              }`}>
                                {expirationInfo.urgencyLevel === 'critical' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
                                {expirationInfo.urgencyLevel === 'warning' && <ClockIcon className="w-3 h-3 mr-1" />}
                                {expirationInfo.urgencyLevel === 'info' && <CalendarIcon className="w-3 h-3 mr-1" />}
                                {expirationInfo.urgencyMessage}
                              </span>
                            )}
                            
                            {/* Badge para productos que no se pueden transferir */}
                            {!expirationInfo.canTransfer && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                                No Transferible
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
                          <span>Humedad: {product.humidity}%</span>
                        </div>
                      </div>

                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/producer/products/${product.id}`}
                              className="btn-secondary text-sm"
                            >
                              Ver Detalles
                            </Link>
                            
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                            >
                              <PencilIcon className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                            >
                              <TrashIcon className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                            
                            {/* Botón de transferir con restricciones de caducidad */}
                            <button 
                              onClick={() => handleTransferClick(product)}
                              disabled={!expirationInfo.canTransfer}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                expirationInfo.canTransfer
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={!expirationInfo.canTransfer ? 'No se puede transferir producto vencido o que vence hoy' : ''}
                            >
                              Transferir
                            </button>
                            
                            <button 
                              onClick={() => handleGenerateQR(product)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                            >
                              QR
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron productos con ese término' : 'Aún no has registrado ningún producto'}
                  </p>
                  <Link href="/producer/create-product" className="btn-primary">
                    Crear Primer Producto
                  </Link>
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
        fromRole={UserRole.PRODUCER}
        onTransferComplete={handleTransferComplete}
      />

      {/* QR Code Modal */}
      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Código QR del Producto</h3>
              
              {/* QR Code Placeholder */}
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                  <div className="text-center">
                    <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Código QR para</p>
                    <p className="text-sm font-medium text-gray-700">{selectedProduct.name}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Escanea este código para verificar la autenticidad del producto
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cerrar
                </button>
                <button className="flex-1 btn-primary">
                  Descargar QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Editar Producto</h3>
              <p className="text-sm text-gray-600">Actualiza la información del producto</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleUpdateProduct({
                name: formData.get('name'),
                description: formData.get('description'),
                weight: formData.get('weight'),
                brand: formData.get('brand'),
                storageConditions: {
                  temperature: formData.get('temperature'),
                  humidity: formData.get('humidity')
                }
              });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedProduct.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    defaultValue={selectedProduct.metadata.weight?.replace('kg', '') || ''}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    name="brand"
                    defaultValue={selectedProduct.metadata.brand || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura</label>
                  <input
                    type="text"
                    name="temperature"
                    defaultValue={selectedProduct.temperature}
                    placeholder="ej. 4°C"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    name="description"
                    defaultValue={selectedProduct.metadata.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar Producto</h3>
              <p className="text-sm text-gray-600 mb-6">
                ¿Estás seguro que deseas eliminar "{selectedProduct.name}"? 
                Esta acción marcará el producto como inactivo pero mantendrá el historial en el blockchain.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 btn-secondary"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
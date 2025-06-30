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
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import TransferModal from '@/components/TransferModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { generateTestExpirationDates, calculateExpirationInfo } from '@/utils/expirationUtils';

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

// Generar fechas de vencimiento variadas para testing
const testDates = generateTestExpirationDates();

const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Lechuga Hidropónica',
    batchNumber: 'BATCH-2025-001',
    productionDate: '2025-01-28',
    expirationDate: testDates.expired, // Vencido hace 2 días
    status: ProductStatus.ACTIVE,
    currentLocation: 'Finca San Pedro - Invernadero A',
    temperature: 4,
    humidity: 85,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Romana',
      weight: '25kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-28'
    }
  },
  {
    id: 'prod-002',
    name: 'Tomates Cherry',
    batchNumber: 'BATCH-2025-002',
    productionDate: '2025-01-29',
    expirationDate: testDates.today, // Vence hoy
    status: ProductStatus.ACTIVE,
    currentLocation: 'Finca San Pedro - Invernadero B',
    temperature: 6,
    humidity: 80,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Cherry',
      weight: '15kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-29'
    }
  },
  {
    id: 'prod-003',
    name: 'Fresas Orgánicas',
    batchNumber: 'BATCH-2025-003',
    productionDate: '2025-01-29',
    expirationDate: testDates.tomorrow, // Vence mañana
    status: ProductStatus.ACTIVE,
    currentLocation: 'Finca San Pedro - Campo C',
    temperature: 2,
    humidity: 90,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Albión',
      weight: '10kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-29'
    }
  },
  {
    id: 'prod-004',
    name: 'Brócoli Fresco',
    batchNumber: 'BATCH-2025-004',
    productionDate: '2025-01-27',
    expirationDate: testDates.threeDays, // Vence en 3 días
    status: ProductStatus.ACTIVE,
    currentLocation: 'Finca San Pedro - Campo D',
    temperature: 1,
    humidity: 95,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Calabrese',
      weight: '30kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-27'
    }
  },
  {
    id: 'prod-005',
    name: 'Café Arábica Premium',
    batchNumber: 'BATCH-2025-005',
    productionDate: '2025-01-10',
    expirationDate: testDates.oneMonth, // Vence en 1 mes
    status: ProductStatus.IN_TRANSIT,
    currentLocation: 'Centro de Procesamiento',
    temperature: 20,
    humidity: 45,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Arábica',
      weight: '100kg',
      certification: 'Fair Trade',
      harvestDate: '2025-01-05'
    }
  },
  {
    id: 'prod-006',
    name: 'Manzanas Rojas Orgánicas',
    batchNumber: 'BATCH-2025-006',
    productionDate: '2025-01-15',
    expirationDate: testDates.oneWeek, // Vence en 1 semana
    status: ProductStatus.ACTIVE,
    currentLocation: 'Finca San Pedro - Cámara Fría',
    temperature: 0,
    humidity: 85,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Red Delicious',
      weight: '500kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-15'
    }
  }
];

export default function ProducerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isLoading, setIsLoading] = useState(false);
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
    // Simplified auth check
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
      
      // Set current user from localStorage
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from the API
      // const dashboardData = await api.get('/dashboard/producer');
      // setStats(dashboardData.stats);
      // setProducts(dashboardData.products);
      
      toast.success('Dashboard actualizado');
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
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
                
                <Link href="/auth" className="btn-primary">
                  Cambiar Usuario
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                            
                            {/* Botón de transferir con restricciones de caducidad */}
                            <button 
                              onClick={() => handleTransferClick(product)}
                              disabled={!expirationInfo.canTransfer}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                expirationInfo.canTransfer
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={!expirationInfo.canTransfer ? 'No se puede transferir producto vencido o que vence hoy' : ''}
                            >
                              Transferir
                            </button>
                            
                            <button className="btn-primary text-sm">
                              Generar QR
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
    </>
  );
}
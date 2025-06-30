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
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';
import TransferModal from '@/components/TransferModal';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { generateTestExpirationDates, calculateExpirationInfo } from '@/utils/expirationUtils';

interface ProcessorStats {
  totalBatches: number;
  activeProcessing: number;
  readyProducts: number;
  rawMaterials: number;
}

const mockStats: ProcessorStats = {
  totalBatches: 28,
  activeProcessing: 12,
  readyProducts: 16,
  rawMaterials: 45
};

// Generar fechas de vencimiento variadas para testing
const testDates = generateTestExpirationDates();

const mockProducts: Product[] = [
  {
    id: 'proc-001',
    name: 'Jugo de Naranja Pasteurizado',
    batchNumber: 'PROC-2025-001',
    productionDate: '2025-01-29',
    expirationDate: testDates.today, // Vence hoy
    status: ProductStatus.ACTIVE,
    currentLocation: 'Planta Procesadora Central - Línea A',
    temperature: 4,
    humidity: 70,
    producer: {
      id: 'processor-001',
      name: 'Procesadora Valle Verde',
      location: 'Zona Industrial, San José'
    },
    metadata: {
      variety: 'Pasteurizado',
      weight: '500L',
      certification: 'HACCP',
      harvestDate: '2025-01-28'
    }
  },
  {
    id: 'proc-002',
    name: 'Yogurt Natural Procesado',
    batchNumber: 'PROC-2025-002',
    productionDate: '2025-01-27',
    expirationDate: testDates.threeDays, // Vence en 3 días
    status: ProductStatus.ACTIVE,
    currentLocation: 'Cámara de Refrigeración B',
    temperature: 2,
    humidity: 80,
    producer: {
      id: 'processor-001',
      name: 'Procesadora Valle Verde',
      location: 'Zona Industrial, San José'
    },
    metadata: {
      variety: 'Natural',
      weight: '200kg',
      certification: 'HACCP',
      harvestDate: '2025-01-25'
    }
  },
  {
    id: 'proc-003',
    name: 'Café Molido Premium',
    batchNumber: 'PROC-2025-003',
    productionDate: '2025-01-18',
    expirationDate: testDates.oneMonth, // Vence en 1 mes
    status: ProductStatus.IN_TRANSIT,
    currentLocation: 'Almacén de Distribución',
    temperature: 20,
    humidity: 40,
    producer: {
      id: 'processor-001',
      name: 'Procesadora Valle Verde',
      location: 'Zona Industrial, San José'
    },
    metadata: {
      variety: 'Arábica Molido',
      weight: '500kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-05'
    }
  },
  {
    id: 'proc-004',
    name: 'Salsa de Tomate Concentrada',
    batchNumber: 'PROC-2025-004',
    productionDate: '2025-01-28',
    expirationDate: testDates.oneWeek, // Vence en 1 semana
    status: ProductStatus.ACTIVE,
    currentLocation: 'Área de Envasado - Línea C',
    temperature: 18,
    humidity: 60,
    producer: {
      id: 'processor-001',
      name: 'Procesadora Valle Verde',
      location: 'Zona Industrial, San José'
    },
    metadata: {
      variety: 'Concentrada',
      weight: '300kg',
      certification: 'HACCP',
      harvestDate: '2025-01-26'
    }
  }
];

export default function ProcessorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ProcessorStats>(mockStats);
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
      
      if (storedRole !== UserRole.PROCESSOR) {
        toast.error('Acceso denegado: Se requiere rol de Procesador');
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
  };

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
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">🏭</span>
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
                ¡Bienvenido, {currentUser?.name || 'Procesador'}!
              </h2>
              <p className="text-gray-600">
                Gestiona el procesamiento de materias primas y controla la producción
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BeakerIcon className="w-6 h-6 text-blue-600" />
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
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Materias Primas</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.rawMaterials}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BeakerIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Procesamiento</h3>
                  <p className="text-gray-600 text-sm">Iniciar procesamiento de materias primas</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Finalizar Lote</h3>
                  <p className="text-gray-600 text-sm">Completar y registrar productos terminados</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DocumentTextIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Control de Calidad</h3>
                  <p className="text-gray-600 text-sm">Verificar estándares y certificaciones</p>
                </div>
              </div>
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
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                            {getStatusIcon(product.status)}
                            <span className="ml-1">{product.status}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <DocumentTextIcon className="w-4 h-4 mr-2" />
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
                          <span className="mr-4">Cantidad: {product.metadata.weight}</span>
                          <span className="mr-4">Temp: {product.temperature}°C</span>
                          <span>Certificación: {product.metadata.certification}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button className="btn-secondary text-sm">
                          Ver Detalles
                        </button>
                        <button 
                          onClick={() => handleTransferClick(product)}
                          className="btn-primary text-sm"
                        >
                          Transferir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8">
                  <BeakerIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
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
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
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';

interface ConsumerStats {
  scannedProducts: number;
  trackedProducts: number;
  notifications: number;
  savedProducts: number;
}

const mockStats: ConsumerStats = {
  scannedProducts: 15,
  trackedProducts: 8,
  notifications: 3,
  savedProducts: 12
};

const mockProducts: Product[] = [
  {
    id: 'cons-001',
    name: 'Manzanas Red Delicious',
    batchNumber: 'PROD-2025-001',
    productionDate: '2025-01-15',
    expirationDate: '2025-02-14',
    status: ProductStatus.ACTIVE,
    currentLocation: 'Tu Hogar',
    temperature: 4,
    humidity: 85,
    producer: {
      id: 'producer-001',
      name: 'Finca San Pedro',
      location: 'Valle Central, Costa Rica'
    },
    metadata: {
      variety: 'Red Delicious',
      weight: '1kg',
      certification: 'Orgánico',
      harvestDate: '2025-01-15'
    }
  },
  {
    id: 'cons-002',
    name: 'Leche Pasteurizada',
    batchNumber: 'DAIRY-2025-005',
    productionDate: '2025-01-25',
    expirationDate: '2025-02-01',
    status: ProductStatus.ACTIVE,
    currentLocation: 'Refrigerador',
    temperature: 2,
    humidity: 60,
    producer: {
      id: 'dairy-001',
      name: 'Lácteos del Valle',
      location: 'Cartago, Costa Rica'
    },
    metadata: {
      variety: 'Pasteurizada',
      weight: '1L',
      certification: 'HACCP',
      harvestDate: '2025-01-24'
    }
  }
];

export default function ConsumerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ConsumerStats>(mockStats);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Simplified auth check
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole');
      const storedUser = localStorage.getItem('authUser');
      
      if (!storedRole || !storedUser) {
        router.push('/auth');
        return;
      }
      
      if (storedRole !== UserRole.CONSUMER) {
        toast.error('Acceso denegado: Se requiere rol de Consumidor');
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
    toast.success('Función de escaneo QR - Demo');
    // En una implementación real, aquí se abriría la cámara
    setTimeout(() => {
      setShowScanner(false);
      toast.success('Producto escaneado: Tomates Cherry Orgánicos');
    }, 2000);
  };

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
                    <span className="text-white font-bold">👥</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Consumidor</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Consumidor'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <InformationCircleIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Historial</h3>
                  <p className="text-gray-600 text-sm">Ver productos consumidos anteriormente</p>
                </div>
              </div>
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
                  const daysUntilExpiry = getDaysUntilExpiry(product.expirationDate);
                  const isExpiring = isExpiringSoon(product.expirationDate);
                  
                  return (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1">{product.status}</span>
                            </span>
                            {isExpiring && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                Vence en {daysUntilExpiry} días
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <DocumentTextIcon className="w-4 h-4 mr-2" />
                              <span>Origen: {product.producer.name}</span>
                            </div>
                            <div className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              <span>Vence: <SafeDate date={product.expirationDate} /></span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-500">
                            <span className="mr-4">Cantidad: {product.metadata.weight}</span>
                            <span className="mr-4">Certificación: {product.metadata.certification}</span>
                            <span>Variedad: {product.metadata.variety}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="btn-secondary text-sm">
                            Ver Trazabilidad
                          </button>
                          <button className="btn-primary text-sm">
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
    </>
  );
}
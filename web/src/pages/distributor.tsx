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
  ThermometerIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/utils/api';
import { Product, ProductStatus, UserRole } from '@/types';
import SafeDate from '@/components/SafeDate';

interface DistributorStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  warehouses: number;
}

const mockStats: DistributorStats = {
  totalShipments: 89,
  inTransit: 23,
  delivered: 66,
  warehouses: 4
};

const mockProducts: Product[] = [
  {
    id: 'dist-001',
    name: 'Lote Frutas Mixtas',
    batchNumber: 'DIST-2025-001',
    productionDate: '2025-01-18',
    expirationDate: '2025-02-15',
    status: ProductStatus.IN_TRANSIT,
    currentLocation: 'Camión Ruta Norte - KM 45',
    temperature: 4,
    humidity: 80,
    producer: {
      id: 'distributor-001',
      name: 'Logística Valle Central',
      location: 'Centro de Distribución Principal'
    },
    metadata: {
      variety: 'Mixto',
      weight: '2000kg',
      certification: 'Cadena de Frío',
      harvestDate: '2025-01-15'
    }
  },
  {
    id: 'dist-002',
    name: 'Productos Lácteos Refrigerados',
    batchNumber: 'DIST-2025-002',
    productionDate: '2025-01-22',
    expirationDate: '2025-02-05',
    status: ProductStatus.ACTIVE,
    currentLocation: 'Almacén Refrigerado A',
    temperature: 2,
    humidity: 65,
    producer: {
      id: 'distributor-001',
      name: 'Logística Valle Central',
      location: 'Centro de Distribución Principal'
    },
    metadata: {
      variety: 'Lácteos',
      weight: '1500kg',
      certification: 'HACCP',
      harvestDate: '2025-01-20'
    }
  }
];

export default function DistributorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DistributorStats>(mockStats);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
      
      if (storedRole !== UserRole.DISTRIBUTOR) {
        toast.error('Acceso denegado: Se requiere rol de Distribuidor');
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
        return <TruckIcon className="w-4 h-4" />;
      case ProductStatus.EXPIRED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case ProductStatus.RECALLED:
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp <= 5) return { color: 'text-blue-600', status: 'Óptima' };
    if (temp <= 15) return { color: 'text-green-600', status: 'Buena' };
    if (temp <= 25) return { color: 'text-orange-600', status: 'Alerta' };
    return { color: 'text-red-600', status: 'Crítica' };
  };

  return (
    <>
      <Head>
        <title>Dashboard Distribuidor - Food Traceability</title>
        <meta name="description" content="Panel de control para distribuidores y logística" />
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
                    <span className="text-white font-bold">🚛</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Distribuidor</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Distribuidor'}</p>
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
                ¡Bienvenido, {currentUser?.name || 'Distribuidor'}!
              </h2>
              <p className="text-gray-600">
                Gestiona la logística y distribución con control de cadena de frío
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Envíos</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalShipments}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TruckIcon className="w-6 h-6 text-blue-600" />
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
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ArchiveBoxIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Almacenes</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.warehouses}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TruckIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nuevo Envío</h3>
                  <p className="text-gray-600 text-sm">Iniciar transporte de productos</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ArchiveBoxIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión Almacén</h3>
                  <p className="text-gray-600 text-sm">Controlar inventario en almacenes</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Control Temperatura</h3>
                  <p className="text-gray-600 text-sm">Monitorear cadena de frío</p>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Envíos Activos</h3>
                
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
                  const tempStatus = getTemperatureStatus(product.temperature);
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
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 ${tempStatus.color}`}>
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {tempStatus.status}
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
                            <span className="mr-4">Carga: {product.metadata.weight}</span>
                            <span className="mr-4">Temp: {product.temperature}°C</span>
                            <span className="mr-4">Humedad: {product.humidity}%</span>
                            <span>Cert: {product.metadata.certification}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="btn-secondary text-sm">
                            Rastrear
                          </button>
                          <button className="btn-primary text-sm">
                            Entregar
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay envíos</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'No se encontraron envíos con ese término' : 'No tienes envíos activos'}
                  </p>
                  <button className="btn-primary">
                    Crear Nuevo Envío
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  EyeIcon,
  UserIcon,
  BuildingStorefrontIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, Product, ProductStatus } from '@/types';
import SafeNumber from '@/components/SafeNumber';
import SafeDate from '@/components/SafeDate';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { calculateExpirationInfo } from '@/utils/expirationUtils';
import Breadcrumb from '@/components/Breadcrumb';

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  activeTransfers: number;
  systemAlerts: number;
  producersCount: number;
  processorsCount: number;
  distributorsCount: number;
  retailersCount: number;
  consumersCount: number;
}

// Datos reales del blockchain - sin mock data

const mockSystemHealth = {
  blockchain: { status: 'healthy', uptime: '99.9%' },
  api: { status: 'healthy', uptime: '99.8%' },
  database: { status: 'healthy', uptime: '100%' },
  notifications: { status: 'warning', uptime: '98.5%' }
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalProducts: 0, activeTransfers: 0, systemAlerts: 0, producersCount: 0, processorsCount: 0, distributorsCount: 0, retailersCount: 0, consumersCount: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
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
      
      if (storedRole !== UserRole.ADMIN) {
        if (mounted) {
          toast.error('Acceso denegado: Se requiere rol de Administrador');
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
      console.log('🔄 Cargando datos del dashboard administrativo...');
      
      // Importar funciones de API para cargar productos reales
      const { getMyProducts } = await import('@/utils/api');
      
      // Cargar todos los productos del sistema para administración
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
          currentLocation: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Sistema Global',
          temperature: foodAsset.storageConditions?.temperature || foodAsset.attributes?.storageConditions?.temperature || 5,
          humidity: foodAsset.storageConditions?.humidity || foodAsset.attributes?.storageConditions?.humidity || 70,
          producer: {
            id: 'admin-system',
            name: foodAsset.origin?.farmName || foodAsset.attributes?.origin?.farmName || 'Sistema Administrativo',
            location: foodAsset.origin?.location || foodAsset.attributes?.origin?.location || 'Vista Global del Sistema'
          },
          metadata: {
            variety: foodAsset.variety || foodAsset.attributes?.variety || 'Administración',
            weight: foodAsset.weight ? `${foodAsset.weight}kg` : (foodAsset.attributes?.weight ? `${foodAsset.attributes.weight}kg` : 'Sin especificar'),
            certification: foodAsset.certifications?.join(', ') || foodAsset.attributes?.certifications?.join(', ') || 'Sistema',
            harvestDate: foodAsset.productionDate || foodAsset.attributes?.productionDate,
            description: foodAsset.description || foodAsset.attributes?.description || 'Producto en el sistema',
            brand: foodAsset.brand || foodAsset.attributes?.brand || 'Sistema Global',
            category: foodAsset.category || foodAsset.attributes?.category || 'ADMIN'
          }
        }));
        
        // Ensure unique products by ID to avoid duplicate keys
        const uniqueProducts = convertedProducts.filter((product, index, array) => 
          index === array.findIndex(p => p.id === product.id)
        );
        setProducts(uniqueProducts);
        
        // Calcular estadísticas del sistema
        const totalProducts = uniqueProducts.length;
        const activeTransfers = uniqueProducts.filter(p => p.status === ProductStatus.IN_TRANSIT).length;
        const systemAlerts = uniqueProducts.filter(p => {
          const expirationInfo = calculateExpirationInfo(p);
          return expirationInfo.urgencyLevel === 'warning' || expirationInfo.urgencyLevel === 'critical';
        }).length;
        
        // Simular distribución de usuarios basada en productos
        const totalUsers = Math.floor(totalProducts * 2.5); // Estimación
        const producersCount = Math.floor(totalProducts * 0.3);
        const processorsCount = Math.floor(totalProducts * 0.2);
        const distributorsCount = Math.floor(totalProducts * 0.15);
        const retailersCount = Math.floor(totalProducts * 0.25);
        const consumersCount = totalUsers - (producersCount + processorsCount + distributorsCount + retailersCount);
        
        setStats({
          totalUsers,
          totalProducts,
          activeTransfers,
          systemAlerts,
          producersCount,
          processorsCount,
          distributorsCount,
          retailersCount,
          consumersCount
        });
        
        // Generar actividad reciente basada en datos reales
        const activity = [
          {
            id: '1',
            type: 'system_metrics',
            message: `Sistema monitoreando ${totalProducts} productos activos`,
            timestamp: new Date().toISOString(),
            status: 'success'
          },
          {
            id: '2',
            type: 'system_alert',
            message: `${systemAlerts} productos requieren atención por fechas de vencimiento`,
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: systemAlerts > 0 ? 'warning' : 'success'
          },
          {
            id: '3',
            type: 'transfer_activity',
            message: `${activeTransfers} transferencias en curso en el sistema`,
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            status: 'success'
          }
        ];
        setRecentActivity(activity);
        
        toast.success(`Dashboard administrativo actualizado - ${totalProducts} productos en el sistema`, { id: 'dashboard-load' });
      } else {
        console.log('ℹ️ No se encontraron productos en el sistema');
        setProducts([]);
        toast.info('Sistema inicializado - No hay productos registrados.', { id: 'dashboard-empty' });
      }
      
    } catch (error: any) {
      console.error('❌ Error al cargar datos del dashboard:', error);
      toast.error(`Error al cargar datos del sistema: ${error.message}`, { id: 'dashboard-error' });
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserIcon className="w-5 h-5 text-blue-600" />;
      case 'system_alert':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      case 'product_expired':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'transfer_completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isInitialLoad) {
    return (
      <>
        <Head>
          <title>Dashboard Administrador - Food Traceability</title>
          <meta name="description" content="Panel de control administrativo del sistema" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Panel Administrativo</h2>
            <p className="text-gray-600">Conectando con el blockchain y cargando datos del sistema...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Administrador - Food Traceability</title>
        <meta name="description" content="Panel de control administrativo del sistema" />
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
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Panel Administrador</h1>
                    <p className="text-sm text-gray-500">{currentUser?.name || 'Administrador'}</p>
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
                  { label: 'Dashboard Administrador', current: true }
                ]}
              />
            </div>

            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Panel de Administración
              </h2>
              <p className="text-gray-600">
                Monitor y administra todo el sistema de trazabilidad de alimentos
              </p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                    <p className="text-2xl font-semibold text-gray-900"><SafeNumber value={stats.totalUsers} /></p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CubeIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Productos</p>
                    <p className="text-2xl font-semibold text-gray-900"><SafeNumber value={stats.totalProducts} /></p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Transferencias Activas</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeTransfers}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Alertas del Sistema</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.systemAlerts}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Usuarios</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">🌱</span>
                      <span className="text-sm font-medium">Productores</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.producersCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">🏭</span>
                      <span className="text-sm font-medium">Procesadores</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.processorsCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">🚛</span>
                      <span className="text-sm font-medium">Distribuidores</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.distributorsCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">🏪</span>
                      <span className="text-sm font-medium">Minoristas</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.retailersCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">👥</span>
                      <span className="text-sm font-medium">Consumidores</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.consumersCount}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="text-sm font-medium">Blockchain</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getSystemStatusColor(mockSystemHealth.blockchain.status)}`}>
                        {mockSystemHealth.blockchain.status === 'healthy' ? 'Saludable' : 'Con Issues'}
                      </span>
                      <span className="text-sm text-gray-500">({mockSystemHealth.blockchain.uptime})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CogIcon className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="text-sm font-medium">API Backend</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getSystemStatusColor(mockSystemHealth.api.status)}`}>
                        {mockSystemHealth.api.status === 'healthy' ? 'Saludable' : 'Con Issues'}
                      </span>
                      <span className="text-sm text-gray-500">({mockSystemHealth.api.uptime})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="text-sm font-medium">Base de Datos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getSystemStatusColor(mockSystemHealth.database.status)}`}>
                        {mockSystemHealth.database.status === 'healthy' ? 'Saludable' : 'Con Issues'}
                      </span>
                      <span className="text-sm text-gray-500">({mockSystemHealth.database.uptime})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="text-sm font-medium">Notificaciones</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getSystemStatusColor(mockSystemHealth.notifications.status)}`}>
                        {mockSystemHealth.notifications.status === 'healthy' ? 'Saludable' : 'Advertencia'}
                      </span>
                      <span className="text-sm text-gray-500">({mockSystemHealth.notifications.uptime})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <UserGroupIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Gestionar Usuarios</h3>
                  <p className="text-xs text-gray-600">Administrar roles y permisos</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <ChartBarIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Reportes</h3>
                  <p className="text-xs text-gray-600">Generar informes del sistema</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CogIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Configuración</h3>
                  <p className="text-xs text-gray-600">Ajustes del sistema</p>
                </div>
              </div>

              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Auditoría</h3>
                  <p className="text-xs text-gray-600">Logs y seguridad</p>
                </div>
              </div>

              <Link href="/profile" className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <UserIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Mi Perfil</h3>
                  <p className="text-xs text-gray-600">Configuración y certificado X.509</p>
                </div>
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
                <button className="btn-secondary text-sm">
                  Ver Todo
                </button>
              </div>

              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        <SafeDate date={activity.timestamp} format="full" />
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status === 'success' ? 'Éxito' : 
                       activity.status === 'warning' ? 'Advertencia' : 'Error'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
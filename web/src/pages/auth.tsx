import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { UserRole } from '@/types';
import { mockLogin } from '@/utils/api';
import { getRoleLabel, getRoleColor } from '@/utils/helpers';

const roleDescriptions: Record<UserRole, string> = {
  [UserRole.PRODUCER]: 'Agricultores y productores primarios que cultivan y producen alimentos.',
  [UserRole.PROCESSOR]: 'Industrias que procesan materias primas en productos alimentarios.',
  [UserRole.DISTRIBUTOR]: 'Empresas de logística y distribución de productos alimentarios.',
  [UserRole.RETAILER]: 'Supermercados, tiendas y puntos de venta al consumidor final.',
  [UserRole.CONSUMER]: 'Consumidores finales que compran y consumen los productos.',
  [UserRole.ADMIN]: 'Administradores del sistema con acceso completo.',
};

const roleDashboards: Record<UserRole, string> = {
  [UserRole.PRODUCER]: '/producer',
  [UserRole.PROCESSOR]: '/processor',
  [UserRole.DISTRIBUTOR]: '/distributor',
  [UserRole.RETAILER]: '/retailer',
  [UserRole.CONSUMER]: '/consumer',
  [UserRole.ADMIN]: '/admin',
};

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleLogin = async (role: UserRole) => {
    setIsLoading(true);
    
    try {
      // Show loading message
      toast.loading('Iniciando sesión...', { id: 'login' });
      
      // Mock login
      const { token, user } = await mockLogin(role);
      
      // Success message
      toast.success(`¡Bienvenido, ${user.name}!`, { id: 'login' });
      
      // Redirect to appropriate dashboard
      router.push(roleDashboards[role]);
      
    } catch (error) {
      toast.error('Error al iniciar sesión', { id: 'login' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Iniciar Sesión - Food Traceability</title>
        <meta name="description" content="Selecciona tu rol para acceder al sistema de trazabilidad" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Volver al inicio</span>
              </Link>
              
              <div className="flex items-center space-x-3 ml-8">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🍎</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">Food Traceability</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Acceder al Sistema
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Selecciona tu rol para acceder a las funcionalidades específicas del sistema de trazabilidad
              </p>
            </div>

            {!selectedRole ? (
              /* Role Selection */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(UserRole).map((role) => (
                  <div
                    key={role}
                    className="card cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="text-center">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${getRoleColor(role)}-100 flex items-center justify-center`}>
                        <span className="text-2xl">
                          {{
                            [UserRole.PRODUCER]: '🌱',
                            [UserRole.PROCESSOR]: '🏭',
                            [UserRole.DISTRIBUTOR]: '🚛',
                            [UserRole.RETAILER]: '🏪',
                            [UserRole.CONSUMER]: '👥',
                            [UserRole.ADMIN]: '⚙️',
                          }[role]}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {getRoleLabel(role)}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {roleDescriptions[role]}
                      </p>
                      
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-${getRoleColor(role)}-100 text-${getRoleColor(role)}-800`}>
                        {role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Login Confirmation */
              <div className="max-w-md mx-auto">
                <div className="card text-center">
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-${getRoleColor(selectedRole)}-100 flex items-center justify-center`}>
                    <span className="text-3xl">
                      {{
                        [UserRole.PRODUCER]: '🌱',
                        [UserRole.PROCESSOR]: '🏭',
                        [UserRole.DISTRIBUTOR]: '🚛',
                        [UserRole.RETAILER]: '🏪',
                        [UserRole.CONSUMER]: '👥',
                        [UserRole.ADMIN]: '⚙️',
                      }[selectedRole]}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Acceder como {getRoleLabel(selectedRole)}
                  </h2>
                  
                  <p className="text-gray-600 mb-6">
                    {roleDescriptions[selectedRole]}
                  </p>
                  
                  <div className="space-y-4">
                    <button
                      onClick={() => handleRoleLogin(selectedRole)}
                      disabled={isLoading}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Iniciando sesión...' : 'Continuar'}
                    </button>
                    
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="w-full btn-secondary"
                      disabled={isLoading}
                    >
                      Cambiar Rol
                    </button>
                  </div>
                </div>

                {/* Demo Information */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 Información de Demo
                  </h3>
                  <p className="text-sm text-blue-800">
                    Esta es una demostración del sistema. El login es automático y te permitirá
                    explorar todas las funcionalidades disponibles para el rol seleccionado.
                  </p>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="mt-12 max-w-md mx-auto">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Estado del Sistema
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Backend</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Activo
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Blockchain</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      🔧 Modo Demo
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Base de Datos</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Conectada
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { UserRole } from '@/types';
import { login as apiLogin, pingChaincode, mockLogin } from '@/utils/api';
import { getRoleLabel, getRoleColor } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { walletService } from '@/services/walletService';

const roleDescriptions: Record<UserRole, string> = {
  [UserRole.PRODUCER]: 'Agricultores y productores primarios que cultivan y producen alimentos.',
  [UserRole.FACTORY]: 'Fábricas que procesan y transforman materias primas.',
  [UserRole.PROCESSOR]: 'Industrias que procesan materias primas en productos alimentarios.',
  [UserRole.DISTRIBUTOR]: 'Empresas de logística y distribución de productos alimentarios.',
  [UserRole.RETAILER]: 'Supermercados, tiendas y puntos de venta al consumidor final.',
  [UserRole.CONSUMER]: 'Consumidores finales que compran y consumen los productos.',
  [UserRole.ADMIN]: 'Administradores del sistema con acceso completo.',
};

const roleDashboards: Record<UserRole, string> = {
  [UserRole.PRODUCER]: '/producer',
  [UserRole.FACTORY]: '/factory',
  [UserRole.PROCESSOR]: '/processor',
  [UserRole.DISTRIBUTOR]: '/distributor',
  [UserRole.RETAILER]: '/retailer',
  [UserRole.CONSUMER]: '/consumer',
  [UserRole.ADMIN]: '/admin',
};

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ address: string; role: UserRole } | null>(null);
  const [showMetaMask, setShowMetaMask] = useState(false);
  const [metaMaskAddress, setMetaMaskAddress] = useState<string | null>(null);

  const handleRoleLogin = async (role: UserRole) => {
    setIsLoading(true);
    
    try {
      // Show loading message
      toast.loading('Conectando con blockchain...', { id: 'login' });
      
      // Use the smart login function (real or mock based on environment)
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
      const loginFunction = isDemoMode ? mockLogin : apiLogin;
      const { token, user } = await loginFunction(role);
      
      // Si estamos en modo real, mostrar información del wallet
      if (!isDemoMode) {
        setWalletInfo({ address: user.address, role });
        console.log('🔑 Wallet info:', {
          address: user.address,
          fabricUserId: user.fabricUserId,
          mspId: user.mspId,
          organizationName: user.organizationName
        });
      }
      
      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(user));
        localStorage.setItem('userRole', role);
        
        // También guardar información del wallet para acceso en el perfil
        if (!isDemoMode && walletInfo) {
          localStorage.setItem('walletInfo', JSON.stringify(walletInfo));
        }
      }
      
      // Test blockchain connection in real mode
      if (!isDemoMode) {
        try {
          const pingResult = await pingChaincode();
          toast.success(`¡Blockchain conectado! ${user.name}`, { id: 'login' });
        } catch (pingError) {
          toast.error('Blockchain no disponible, usando modo local', { id: 'login' });
        }
      } else {
        toast.success(`¡Bienvenido, ${user.name}! (Modo Demo)`, { id: 'login' });
      }
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to appropriate dashboard
      window.location.href = roleDashboards[role];
      
    } catch (error) {
      toast.error('Error al conectar con el sistema', { id: 'login' });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaMaskConnect = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      toast.loading('Conectando con MetaMask...', { id: 'metamask' });

      // Verificar si MetaMask está disponible
      if (!walletService.isMetaMaskAvailable()) {
        throw new Error('MetaMask no está instalado. Por favor instala MetaMask para continuar.');
      }

      // Conectar con MetaMask
      const wallet = await walletService.connectMetaMask();
      setMetaMaskAddress(wallet.address);

      toast.success(`MetaMask conectado: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`, { id: 'metamask' });

      // Simular login con la dirección de MetaMask
      const user = {
        id: wallet.address,
        address: wallet.address,
        name: `Usuario MetaMask (${getRoleLabel(selectedRole)})`,
        role: selectedRole,
        fabricUserId: `metamask_${wallet.address}`,
        mspId: selectedRole === UserRole.PRODUCER ? 'Org1MSP' : 'Org2MSP',
        organizationName: selectedRole === UserRole.PRODUCER ? 'org1.example.com' : 'org2.example.com'
      };

      const token = `metamask_${wallet.address}_${Date.now()}`;

      // Guardar info de wallet MetaMask
      setWalletInfo({ address: wallet.address, role: selectedRole });
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(user));
        localStorage.setItem('userRole', selectedRole);
        localStorage.setItem('walletInfo', JSON.stringify({ address: wallet.address, role: selectedRole }));
        localStorage.setItem('walletProvider', 'metamask');
      }

      // Llamar al hook de autenticación
      login(token, user);

      // Pequeño delay para UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirigir al dashboard correspondiente
      window.location.href = roleDashboards[selectedRole];

    } catch (error: any) {
      console.error('Error conectando MetaMask:', error);
      toast.error(error.message || 'Error al conectar con MetaMask', { id: 'metamask' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedLogin = async () => {
    if (!selectedRole) return;
    await handleRoleLogin(selectedRole);
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
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-2xl">
                          {{
                            [UserRole.PRODUCER]: '🌱',
                            [UserRole.FACTORY]: '🏭',
                            [UserRole.PROCESSOR]: '⚙️',
                            [UserRole.DISTRIBUTOR]: '🚛',
                            [UserRole.RETAILER]: '🏪',
                            [UserRole.CONSUMER]: '👥',
                            [UserRole.ADMIN]: '🔧',
                          }[role]}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {getRoleLabel(role)}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {roleDescriptions[role]}
                      </p>
                      
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-3xl">
                      {{
                        [UserRole.PRODUCER]: '🌱',
                        [UserRole.FACTORY]: '🏭',
                        [UserRole.PROCESSOR]: '⚙️',
                        [UserRole.DISTRIBUTOR]: '🚛',
                        [UserRole.RETAILER]: '🏪',
                        [UserRole.CONSUMER]: '👥',
                        [UserRole.ADMIN]: '🔧',
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
                    {/* MetaMask Option */}
                    {walletService.isMetaMaskAvailable() && (
                      <button
                        onClick={handleMetaMaskConnect}
                        disabled={isLoading}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        <span>🦊</span>
                        <span>{isLoading ? 'Conectando MetaMask...' : 'Conectar con MetaMask'}</span>
                      </button>
                    )}
                    
                    {/* Predefined Wallet Option */}
                    <button
                      onClick={handlePredefinedLogin}
                      disabled={isLoading}
                      className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Iniciando sesión...' : 'Usar Wallet Predefinido (Demo)'}
                    </button>
                    
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="w-full btn-outline"
                      disabled={isLoading}
                    >
                      Cambiar Rol
                    </button>
                    
                    {/* MetaMask Status */}
                    {metaMaskAddress && (
                      <div className="p-3 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-800">
                          🦊 MetaMask conectado: {metaMaskAddress.slice(0, 6)}...{metaMaskAddress.slice(-4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Demo Information */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 Opciones de Autenticación
                  </h3>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p>
                      <strong>🦊 MetaMask:</strong> Conecta tu wallet MetaMask para una experiencia 
                      más realista. Tu dirección de Ethereum se usará como identificador.
                    </p>
                    <p>
                      <strong>🔑 Wallet Predefinido:</strong> Usa un wallet predefinido para demo. 
                      Ideal para explorar el sistema sin configurar MetaMask.
                    </p>
                    {!walletService.isMetaMaskAvailable() && (
                      <p className="text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        Para usar MetaMask, instálalo desde{' '}
                        <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline">
                          metamask.io
                        </a>
                      </p>
                    )}
                  </div>
                  
                  {/* Wallet Information */}
                  {walletInfo && (
                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                      <h4 className="text-sm font-semibold text-green-900 mb-1">
                        🔑 Información del Wallet (ethers.js)
                      </h4>
                      <div className="text-xs text-green-800 space-y-1">
                        <div><strong>Rol:</strong> {walletInfo.role}</div>
                        <div><strong>Dirección:</strong> {walletInfo.address}</div>
                        <div className="text-green-600">
                          ✅ Wallet cargado automáticamente para autenticación con firmas
                        </div>
                      </div>
                    </div>
                  )}
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '🔧 Modo Demo' : '⛓️ Blockchain Real'}
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
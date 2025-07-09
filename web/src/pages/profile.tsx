/**
 * Página de perfil del usuario
 * Muestra información de autenticación X.509, wallet ethers.js y configuración
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  KeyIcon,
  CreditCardIcon,
  CogIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { walletService } from '@/services/walletService';
import { getRoleLabel, getRoleColor, truncateAddress } from '@/utils/helpers';
import { UserRole } from '@/types';
import Breadcrumb from '@/components/Breadcrumb';
import SafeDate from '@/components/SafeDate';

interface UserInfo {
  address: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  fabricUserId?: string;
  mspId?: string;
  certificateId?: string;
  organizationName?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WalletInfo {
  address: string;
  privateKey: string;
  publicKey: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletProvider, setWalletProvider] = useState<'metamask' | 'predefined' | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadStarted = false;
    
    const load = async () => {
      if (!mounted || loadStarted) return;
      loadStarted = true;
      await loadUserProfile();
    };
    
    load();
    
    return () => {
      mounted = false;
    };
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      // Cargar información del usuario desde localStorage
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('authUser');
        const storedRole = localStorage.getItem('userRole');
        
        // Cargar transferencias del usuario
        try {
          const { getMyTransfers } = await import('@/utils/api');
          const transfersResponse = await getMyTransfers();
          if (transfersResponse.success) {
            setTransfers(transfersResponse.data);
          }
        } catch (error) {
          console.error('Error loading transfers:', error);
        }
        
        if (storedUser && storedRole) {
          const parsedUser = JSON.parse(storedUser);
          
          // Crear estructura completa del usuario con valores por defecto
          const completeUserInfo: UserInfo = {
            address: parsedUser.address || 'N/A',
            name: parsedUser.name || 'Usuario',
            role: parsedUser.role || 'PRODUCER',
            email: parsedUser.email || 'No especificado',
            phone: parsedUser.phone || 'No especificado',
            location: parsedUser.location || {
              address: 'No especificado',
              city: 'No especificado',
              country: 'No especificado',
              coordinates: { lat: 0, lng: 0 }
            },
            fabricUserId: parsedUser.fabricUserId || 'N/A',
            mspId: parsedUser.mspId || 'N/A',
            certificateId: parsedUser.certificateId || 'N/A',
            organizationName: parsedUser.organizationName || 'N/A',
            isActive: parsedUser.isActive !== undefined ? parsedUser.isActive : true,
            isVerified: parsedUser.isVerified !== undefined ? parsedUser.isVerified : false,
            createdAt: parsedUser.createdAt || new Date().toISOString(),
            updatedAt: parsedUser.updatedAt || new Date().toISOString()
          };
          
          setUserInfo(completeUserInfo);
          
          // Cargar información del wallet
          const providerType = localStorage.getItem('walletProvider');
          setWalletProvider(providerType as 'metamask' | 'predefined');
          
          try {
            if (providerType === 'metamask') {
              // Para MetaMask, usar la dirección del usuario
              const metaMaskWallet: WalletInfo = {
                address: parsedUser.address,
                privateKey: '', // No disponible por seguridad
                publicKey: '' // No disponible por seguridad
              };
              setWalletInfo(metaMaskWallet);
              
              console.log('🦊 Wallet MetaMask cargado:', {
                address: parsedUser.address,
                provider: 'metamask'
              });
            } else {
              // Wallet predefinido
              const wallet = walletService.loadWalletByRole(storedRole as UserRole);
              setWalletInfo(wallet);
              
              console.log('🔑 Wallet predefinido cargado:', {
                address: wallet.address,
                provider: 'predefined'
              });
            }
          } catch (walletError) {
            console.error('❌ Error cargando wallet:', walletError);
            // Crear wallet básico con la dirección del usuario
            setWalletInfo({
              address: parsedUser.address || 'N/A',
              privateKey: '',
              publicKey: ''
            });
          }
          
          console.log('👤 Perfil de usuario cargado:', {
            user: completeUserInfo,
            walletProvider: providerType || 'unknown'
          });
        } else {
          toast.error('No se encontró información del usuario', { id: 'profile-error' });
          router.push('/auth');
        }
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      toast.error('Error al cargar el perfil', { id: 'profile-load-error' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`, { id: 'clipboard-success' });
    } catch (error) {
      toast.error('Error al copiar al portapapeles', { id: 'clipboard-error' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada exitosamente', { id: 'logout-success' });
      router.push('/auth');
    } catch (error) {
      toast.error('Error al cerrar sesión', { id: 'logout-error' });
    }
  };

  const getDashboardLink = (role: UserRole): string => {
    const dashboardMap: Record<UserRole, string> = {
      [UserRole.PRODUCER]: '/producer',
      [UserRole.FACTORY]: '/factory',
      [UserRole.PROCESSOR]: '/processor',
      [UserRole.DISTRIBUTOR]: '/distributor',
      [UserRole.RETAILER]: '/retailer',
      [UserRole.CONSUMER]: '/consumer',
      [UserRole.ADMIN]: '/admin',
    };
    return dashboardMap[role] || '/auth';
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Mi Perfil - Food Traceability</title>
          <meta name="description" content="Información del perfil de usuario y configuración" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando Perfil</h2>
            <p className="text-gray-600">Obteniendo información del usuario y configuración...</p>
          </div>
        </div>
      </>
    );
  }

  if (!userInfo) {
    return (
      <>
        <Head>
          <title>Mi Perfil - Food Traceability</title>
          <meta name="description" content="Información del perfil de usuario y configuración" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al Cargar Perfil</h2>
            <p className="text-gray-600 mb-4">No se pudo cargar la información del usuario</p>
            <Link href="/auth" className="btn-primary">
              Volver al Login
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Mi Perfil - Food Traceability</title>
        <meta name="description" content="Información del perfil de usuario y configuración" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link 
                  href={getDashboardLink(userInfo.role)} 
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver al Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Mi Perfil</h1>
                    <p className="text-sm text-gray-500">Información de usuario y configuración</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb 
                items={[
                  { label: 'Dashboard', href: getDashboardLink(userInfo.role) },
                  { label: 'Mi Perfil', current: true }
                ]}
              />
            </div>
            
            {/* Información Básica del Usuario */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <UserIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Información Básica</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <p className="text-gray-900 font-medium">{userInfo.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Rol</label>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getRoleColor(userInfo.role)}-100 text-${getRoleColor(userInfo.role)}-800`}>
                      {getRoleLabel(userInfo.role)}
                    </span>
                    {userInfo.isVerified && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{userInfo.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="text-gray-900">{userInfo.phone}</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Ubicación</label>
                  <p className="text-gray-900">
                    {userInfo.location.address}, {userInfo.location.city}, {userInfo.location.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Información de Certificado X.509 */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Certificado X.509 (Hyperledger Fabric)</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Fabric User ID</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono text-xs">{userInfo.fabricUserId}</p>
                    <button
                      onClick={() => copyToClipboard(userInfo.fabricUserId || '', 'Fabric User ID')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">MSP ID</label>
                  <p className="text-gray-900 font-mono text-sm">{userInfo.mspId}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Certificate ID</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono text-sm">{userInfo.certificateId}</p>
                    <button
                      onClick={() => copyToClipboard(userInfo.certificateId || '', 'Certificate ID')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Organización</label>
                  <p className="text-gray-900">{userInfo.organizationName}</p>
                </div>
              </div>
            </div>

            {/* Información del Wallet ethers.js */}
            {walletInfo && (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <CreditCardIcon className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Wallet ethers.js</h2>
                  </div>
                  {walletProvider && (
                    <div className="flex items-center space-x-2">
                      {walletProvider === 'metamask' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          🦊 MetaMask
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🔑 Predefinido
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Dirección del Wallet</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-900 font-mono text-sm">{walletInfo.address}</p>
                      <button
                        onClick={() => copyToClipboard(walletInfo.address, 'Dirección del Wallet')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Esta dirección se usa para firmar transacciones en el blockchain
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Clave Pública</label>
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-900 font-mono text-xs break-all">
                        {walletInfo.publicKey && walletInfo.publicKey.length > 0 
                          ? `${truncateAddress(walletInfo.publicKey, 20)}...`
                          : 'No disponible (MetaMask)'
                        }
                      </p>
                      {walletInfo.publicKey && walletInfo.publicKey.length > 0 && (
                        <button
                          onClick={() => copyToClipboard(walletInfo.publicKey, 'Clave Pública')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {(!walletInfo.publicKey || walletInfo.publicKey.length === 0) && (
                      <p className="text-xs text-amber-600 mt-1">
                        🦊 MetaMask no expone la clave pública por seguridad
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Clave Privada</label>
                      {walletInfo.privateKey && walletInfo.privateKey.length > 0 && (
                        <button
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                        >
                          {showPrivateKey ? (
                            <>
                              <EyeSlashIcon className="w-4 h-4" />
                              <span>Ocultar</span>
                            </>
                          ) : (
                            <>
                              <EyeIcon className="w-4 h-4" />
                              <span>Mostrar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-900 font-mono text-xs break-all">
                        {walletInfo.privateKey && walletInfo.privateKey.length > 0 
                          ? (showPrivateKey ? walletInfo.privateKey : '••••••••••••••••••••••••••••••••')
                          : 'No disponible (MetaMask)'
                        }
                      </p>
                      {showPrivateKey && walletInfo.privateKey && walletInfo.privateKey.length > 0 && (
                        <button
                          onClick={() => copyToClipboard(walletInfo.privateKey, 'Clave Privada')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {(!walletInfo.privateKey || walletInfo.privateKey.length === 0) ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <ShieldCheckIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">🦊 Wallet MetaMask</p>
                            <p>Por seguridad, MetaMask no expone las claves privadas. Las transacciones se firman directamente en la extensión.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <p className="font-medium">¡Importante!</p>
                            <p>Nunca compartas tu clave privada. Es necesaria para firmar transacciones y acceder a tus fondos.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Role-Specific Information */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <CogIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Funcionalidades del Rol</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userInfo.role === UserRole.PRODUCER && (
                  <>
                    <Link href="/producer/create-product" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 font-bold">+</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Crear Producto</h3>
                          <p className="text-xs text-gray-500">Registrar nuevos productos</p>
                        </div>
                      </div>
                    </Link>
                    <Link href="/producer/transfer" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ArrowRightIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Transferir Productos</h3>
                          <p className="text-xs text-gray-500">Enviar a procesadores</p>
                        </div>
                      </div>
                    </Link>
                    <Link href="/producer/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Reportes</h3>
                          <p className="text-xs text-gray-500">Estadísticas de producción</p>
                        </div>
                      </div>
                    </Link>
                  </>
                )}
                
                {userInfo.role === UserRole.PROCESSOR && (
                  <>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <CogIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Procesar Materias Primas</h3>
                          <p className="text-xs text-gray-500">Transformar productos agrícolas</p>
                        </div>
                      </div>
                    </div>
                    <Link href="/processor/transfer" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <ArrowRightIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Transferir Procesados</h3>
                          <p className="text-xs text-gray-500">Enviar a distribuidores</p>
                        </div>
                      </div>
                    </Link>
                    <Link href="/processor/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Métricas de Calidad</h3>
                          <p className="text-xs text-gray-500">Reportes de procesamiento</p>
                        </div>
                      </div>
                    </Link>
                  </>
                )}
                
                {userInfo.role === UserRole.DISTRIBUTOR && (
                  <>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold">📦</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Gestión de Inventario</h3>
                          <p className="text-xs text-gray-500">Control de almacenes</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <ArrowRightIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Distribución</h3>
                          <p className="text-xs text-gray-500">Enviar a minoristas</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Logística</h3>
                          <p className="text-xs text-gray-500">Rutas y entregas</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {userInfo.role === UserRole.RETAILER && (
                  <>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 font-bold">🏪</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Punto de Venta</h3>
                          <p className="text-xs text-gray-500">Gestión de tienda</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Venta a Consumidores</h3>
                          <p className="text-xs text-gray-500">Transacciones finales</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <ClockIcon className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Control de Fechas</h3>
                          <p className="text-xs text-gray-500">Gestión de vencimientos</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {userInfo.role === UserRole.CONSUMER && (
                  <>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <EyeIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Ver Trazabilidad</h3>
                          <p className="text-xs text-gray-500">Historia del producto</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Marcar como Consumido</h3>
                          <p className="text-xs text-gray-500">Finalizar trazabilidad</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Valorar Producto</h3>
                          <p className="text-xs text-gray-500">Feedback y calificaciones</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {userInfo.role === UserRole.ADMIN && (
                  <>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <ShieldCheckIcon className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Gestión de Usuarios</h3>
                          <p className="text-xs text-gray-500">Administrar roles y permisos</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Reportes del Sistema</h3>
                          <p className="text-xs text-gray-500">Estadísticas globales</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <CogIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Configuración</h3>
                          <p className="text-xs text-gray-500">Configuración del sistema</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent Transfers Section */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <ArrowRightIcon className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Transferencias Recientes</h2>
              </div>
              
              {transfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destinatario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transfers.slice(0, 5).map((transfer, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {transfer.tokenId}
                            </div>
                            <div className="text-sm text-gray-500">
                              Cantidad: {transfer.amount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              transfer.transferType === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                              transfer.transferType === 'DISTRIBUTION' ? 'bg-green-100 text-green-800' :
                              transfer.transferType === 'SALE' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {transfer.transferType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <SafeDate date={transfer.timestamp} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transfer.notes || 'Sin notas'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ArrowRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sin transferencias</h3>
                  <p className="text-gray-600 mb-4">
                    {userInfo.role === UserRole.PRODUCER && 'Aquí aparecerán los productos que has transferido a procesadores y distribuidores.'}
                    {userInfo.role === UserRole.PROCESSOR && 'Aquí aparecerán los productos procesados que has transferido a distribuidores.'}
                    {userInfo.role === UserRole.DISTRIBUTOR && 'Aquí aparecerán los productos que has distribuido a minoristas.'}
                    {userInfo.role === UserRole.RETAILER && 'Aquí aparecerán los productos vendidos a consumidores.'}
                    {userInfo.role === UserRole.CONSUMER && 'Aquí aparecerán los productos que has marcado como consumidos.'}
                    {userInfo.role === UserRole.ADMIN && 'Historial completo de transferencias del sistema.'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Las transferencias realizadas se registran en el blockchain para garantizar la trazabilidad completa.
                  </p>
                </div>
              )}
            </div>

            {/* Estado de la Cuenta */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <IdentificationIcon className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">Estado de la Cuenta</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${userInfo.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Estado de la Cuenta</p>
                    <p className={`text-sm ${userInfo.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {userInfo.isActive ? 'Activa' : 'Inactiva'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${userInfo.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Verificación</p>
                    <p className={`text-sm ${userInfo.isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {userInfo.isVerified ? 'Verificada' : 'Pendiente'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de Creación</p>
                  <p className="text-sm text-gray-600">
                    {new Date(userInfo.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Última Actualización</p>
                  <p className="text-sm text-gray-600">
                    {new Date(userInfo.updatedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-center space-x-4">
              <Link
                href={getDashboardLink(userInfo.role)}
                className="btn-primary"
              >
                Volver al Dashboard
              </Link>
              
              <button
                onClick={handleLogout}
                className="btn-secondary"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
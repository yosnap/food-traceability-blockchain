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
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { walletService } from '@/services/walletService';
import { getRoleLabel, getRoleColor, truncateAddress } from '@/utils/helpers';
import { UserRole } from '@/types';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No se pudo cargar la información del usuario</p>
          <Link href="/auth" className="btn-primary mt-4">
            Volver al Login
          </Link>
        </div>
      </div>
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            
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
                    <p className="text-gray-900 font-mono text-sm">{userInfo.fabricUserId}</p>
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
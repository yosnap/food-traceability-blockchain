/**
 * Dashboard para usuarios normales (Next.js)
 * Ruta: /dashboard
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import UserProfile from '../components/UserProfile';
import { 
    UserIcon,
    CogIcon,
    ClipboardDocumentListIcon,
    QrCodeIcon
} from '@heroicons/react/24/outline';

interface User {
    walletAddress: string;
    role: string;
    name: string;
    token: string;
    isActive: boolean;
}

const Dashboard: React.FC = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<'profile' | 'operations'>('profile');
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);

    /**
     * Conectar y autenticar usuario
     */
    const connectUser = async (): Promise<void> => {
        try {
            setLoading(true);

            if (typeof window === 'undefined' || !window.ethereum) {
                toast.error('MetaMask no está instalado');
                return;
            }

            // Conectar MetaMask
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            
            if (accounts.length === 0) {
                toast.error('No se pudo conectar a MetaMask');
                return;
            }

            const walletAddress = accounts[0];

            // Verificar estado de registro primero
            await checkRegistrationStatus(walletAddress);

        } catch (error: any) {
            console.error('❌ Error conectando usuario:', error);
            toast.error('Error conectando wallet');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Verificar estado de registro del usuario
     */
    const checkRegistrationStatus = async (walletAddress: string): Promise<void> => {
        try {
            setCheckingStatus(true);

            const response = await fetch(`/api/registration/status/${walletAddress}`);
            const data = await response.json();

            if (data.success) {
                // Si el servidor indica que verifiquemos localmente
                if (data.requiresClientCheck || data.instructions === 'CLIENT_SHOULD_CHECK_LOCALSTORAGE') {
                    // Verificar en localStorage si el usuario está aprobado
                    const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
                    const userRecord = approvedUsers.find((user: any) => 
                        user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
                    );
                    
                    if (userRecord) {
                        console.log('✅ Usuario encontrado en localStorage:', userRecord);
                        // Usuario aprobado, intentar login
                        await loginUser(walletAddress, userRecord.requestedRole);
                        return;
                    }
                    
                    // Si no está aprobado, verificar si está pendiente
                    const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
                    const pendingRecord = pendingRequests.find((req: any) => 
                        req.walletAddress.toLowerCase() === walletAddress.toLowerCase() && 
                        req.status === 'pending'
                    );
                    
                    if (pendingRecord) {
                        toast.error('Tu solicitud de registro está pendiente de aprobación por el administrador.');
                        return;
                    }
                    
                    // Usuario no registrado
                    toast.error('No tienes una cuenta registrada. Por favor, solicita registro primero.');
                    setTimeout(() => {
                        window.location.href = '/register';
                    }, 2000);
                    return;
                }
                
                // Manejar respuestas directas del servidor (para admin y casos especiales)
                if (data.status === 'approved') {
                    // Usuario aprobado, intentar login
                    await loginUser(walletAddress, data.profile.role);
                } else if (data.status === 'not_found') {
                    // Usuario no registrado
                    toast.error('No tienes una cuenta registrada. Por favor, solicita registro primero.');
                    setTimeout(() => {
                        window.location.href = '/register';
                    }, 2000);
                } else {
                    toast.error('Tu solicitud de registro está pendiente de aprobación por el administrador.');
                }
            } else {
                toast.error('Error verificando el estado de registro');
            }
        } catch (error) {
            console.error('Error verificando estado:', error);
            toast.error('Error conectando con el servidor');
        } finally {
            setCheckingStatus(false);
        }
    };

    /**
     * Hacer login del usuario
     */
    const loginUser = async (walletAddress: string, role: string): Promise<void> => {
        try {
            if (typeof window === 'undefined' || !window.ethereum) {
                toast.error('MetaMask no disponible');
                return;
            }

            // Crear mensaje para firmar
            const message = `Login to Food Traceability System\nTimestamp: ${Date.now()}`;
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(message);

            // Autenticar en el backend
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress,
                    signature,
                    message,
                    role
                })
            });

            const data = await response.json();

            if (data.success) {
                const userData: User = {
                    walletAddress,
                    role,
                    name: data.data.user.name,
                    token: data.data.token,
                    isActive: data.data.user.isActive
                };

                setUser(userData);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('userSession', JSON.stringify(userData));
                    
                    // Actualizar último acceso en approvedUsers
                    try {
                        const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
                        const userIndex = approvedUsers.findIndex((u: any) => 
                            u.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
                        );
                        
                        if (userIndex !== -1) {
                            approvedUsers[userIndex].lastLogin = new Date().toISOString();
                            localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));
                            console.log('📅 Actualizado último acceso en localStorage');
                        }
                    } catch (updateError) {
                        console.log('⚠️ Error actualizando último acceso:', updateError);
                    }
                }
                toast.success(`¡Bienvenido, ${userData.name}!`, { id: 'user-login' });
                
            } else {
                toast.error(data.message || 'Error en autenticación');
            }

        } catch (error: any) {
            console.error('❌ Error en login:', error);
            toast.error('Error en el proceso de login');
        }
    };

    /**
     * Cerrar sesión
     */
    const logout = (): void => {
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('userSession');
        }
        toast.success('Sesión cerrada');
    };

    /**
     * Obtener etiqueta del rol
     */
    const getRoleLabel = (role: string): string => {
        const labels = {
            producer: 'Productor',
            factory: 'Procesador',
            distributor: 'Distribuidor',
            retailer: 'Minorista',
            consumer: 'Consumidor'
        };
        return labels[role as keyof typeof labels] || role;
    };

    /**
     * Obtener color del rol
     */
    const getRoleColor = (role: string): string => {
        const colors = {
            producer: 'bg-green-100 text-green-800',
            factory: 'bg-blue-100 text-blue-800',
            distributor: 'bg-yellow-100 text-yellow-800',
            retailer: 'bg-purple-100 text-purple-800',
            consumer: 'bg-gray-100 text-gray-800'
        };
        return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    // Verificar sesión existente al cargar
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem('userSession');
            if (savedSession) {
                try {
                    const userData = JSON.parse(savedSession);
                    setUser(userData);
                } catch (error) {
                    localStorage.removeItem('userSession');
                    router.push('/auth');
                }
            } else {
                // No hay sesión, redireccionar a auth
                router.push('/auth');
            }
        }
    }, [router]);

    // Si no está autenticado, mostrar pantalla de login
    if (!user) {
        return (
            <>
                <Head>
                    <title>Dashboard - Food Traceability System</title>
                    <meta name="description" content="Accede a tu cuenta del sistema de trazabilidad" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>

                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                        <div className="text-center">
                            <UserIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Acceso al Sistema
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Conecta tu wallet para acceder a tu cuenta
                            </p>
                            
                            {checkingStatus && (
                                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        Verificando estado de tu registro...
                                    </p>
                                </div>
                            )}
                            
                            <button
                                onClick={connectUser}
                                disabled={loading || checkingStatus}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                            >
                                {loading ? 'Conectando...' : 
                                 checkingStatus ? 'Verificando...' : 
                                 'Conectar Wallet'}
                            </button>

                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">
                                    ¿No tienes una cuenta?
                                </p>
                                <button
                                    onClick={() => window.location.href = '/register'}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Solicitar Registro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Dashboard - {getRoleLabel(user.role)} - Food Traceability</title>
                <meta name="description" content={`Dashboard para ${getRoleLabel(user.role)}`} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div className="flex items-center space-x-4">
                                <UserIcon className="h-8 w-8 text-blue-600" />
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        Food Traceability System
                                    </h1>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500">
                                            {user.name} • {user.walletAddress.slice(0, 10)}...
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={logout}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="bg-white border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex space-x-8">
                            <button
                                onClick={() => setCurrentView('profile')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    currentView === 'profile'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <UserIcon className="h-4 w-4 inline mr-1" />
                                Mi Perfil
                            </button>
                            <button
                                onClick={() => setCurrentView('operations')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    currentView === 'operations'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ClipboardDocumentListIcon className="h-4 w-4 inline mr-1" />
                                Operaciones
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    {currentView === 'profile' && user && (
                        <UserProfile
                            userToken={user.token}
                            onProfileUpdate={(profile) => {
                                console.log('Perfil actualizado:', profile);
                            }}
                        />
                    )}

                    {currentView === 'operations' && (
                        <div className="px-4 py-6">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">
                                    Operaciones Disponibles para {getRoleLabel(user.role)}
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Operaciones según el rol */}
                                    {user.role === 'producer' && (
                                        <>
                                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                                <h3 className="font-medium text-gray-900 mb-2">Crear Producto</h3>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Registrar un nuevo producto en la cadena
                                                </p>
                                                <button 
                                                    onClick={() => window.location.href = '/producer/create-product'}
                                                    className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                                                >
                                                    Crear Producto
                                                </button>
                                            </div>
                                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                                <h3 className="font-medium text-gray-900 mb-2">Transferir Producto</h3>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Enviar producto al siguiente en la cadena
                                                </p>
                                                <button 
                                                    onClick={() => window.location.href = '/producer/transfer'}
                                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                                                >
                                                    Transferir
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {user.role === 'factory' && (
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Procesar Producto</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Registrar procesamiento del producto
                                            </p>
                                            <button 
                                                onClick={() => window.location.href = '/processor/transfer'}
                                                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                                            >
                                                Procesar
                                            </button>
                                        </div>
                                    )}

                                    {user.role === 'retailer' && (
                                        <>
                                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                                <h3 className="font-medium text-gray-900 mb-2">Recibir Producto</h3>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Confirmar recepción de productos
                                                </p>
                                                <button 
                                                    onClick={() => window.location.href = '/retailer'}
                                                    className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
                                                >
                                                    Recibir
                                                </button>
                                            </div>
                                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                                <h3 className="font-medium text-gray-900 mb-2">Generar QR</h3>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Crear código QR para consumidores
                                                </p>
                                                <button 
                                                    onClick={() => window.location.href = '/retailer'}
                                                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
                                                >
                                                    <QrCodeIcon className="h-4 w-4 inline mr-1" />
                                                    Generar QR
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {user.role === 'consumer' && (
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Escanear QR</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Ver trazabilidad de productos
                                            </p>
                                            <button 
                                                onClick={() => window.location.href = '/consumer'}
                                                className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                                            >
                                                <QrCodeIcon className="h-4 w-4 inline mr-1" />
                                                Escanear
                                            </button>
                                        </div>
                                    )}

                                    {/* Operación común para todos */}
                                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                        <h3 className="font-medium text-gray-900 mb-2">Ver Historial</h3>
                                        <p className="text-sm text-gray-500 mb-3">
                                            Consultar historial de operaciones
                                        </p>
                                        <button className="w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700">
                                            Ver Historial
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Dashboard;
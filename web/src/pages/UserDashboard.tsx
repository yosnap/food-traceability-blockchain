/**
 * Dashboard para usuarios normales (aprobados)
 * Incluye perfil editable y funcionalidades del rol
 */

import React, { useState, useEffect } from 'react';
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

const UserDashboard: React.FC = () => {
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

            if (!window.ethereum) {
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
                localStorage.setItem('userSession', JSON.stringify(userData));
                toast.success(`¡Bienvenido, ${userData.name}!`);
                
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
        localStorage.removeItem('userSession');
        toast.success('Sesión cerrada');
    };

    /**
     * Obtener etiqueta del rol
     */
    const getRoleLabel = (role: string): string => {
        const labels = {
            producer: 'Productor',
            factory: 'Procesador',
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
            retailer: 'bg-purple-100 text-purple-800',
            consumer: 'bg-gray-100 text-gray-800'
        };
        return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    // Verificar sesión existente al cargar
    useEffect(() => {
        const savedSession = localStorage.getItem('userSession');
        if (savedSession) {
            try {
                const userData = JSON.parse(savedSession);
                setUser(userData);
            } catch (error) {
                localStorage.removeItem('userSession');
            }
        }
    }, []);

    // Si no está autenticado, mostrar pantalla de login
    if (!user) {
        return (
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
        );
    }

    return (
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
                {currentView === 'profile' && (
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
                                Operaciones Disponibles
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
                                            <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                                                Crear Producto
                                            </button>
                                        </div>
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Transferir Producto</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Enviar producto al siguiente en la cadena
                                            </p>
                                            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                                                Transferir
                                            </button>
                                        </div>
                                    </>
                                )}

                                {user.role === 'factory' && (
                                    <>
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Procesar Producto</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Registrar procesamiento del producto
                                            </p>
                                            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                                                Procesar
                                            </button>
                                        </div>
                                    </>
                                )}

                                {user.role === 'retailer' && (
                                    <>
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Recibir Producto</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Confirmar recepción de productos
                                            </p>
                                            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                                                Recibir
                                            </button>
                                        </div>
                                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                            <h3 className="font-medium text-gray-900 mb-2">Generar QR</h3>
                                            <p className="text-sm text-gray-500 mb-3">
                                                Crear código QR para consumidores
                                            </p>
                                            <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
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
                                        <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
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

                            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Próximamente:</strong> Funcionalidades completas para {getRoleLabel(user.role)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;
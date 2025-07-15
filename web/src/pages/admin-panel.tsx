/**
 * Panel de administración para Next.js
 * Ruta: /admin-panel
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import AdminRegistrationPanel from '../components/AdminRegistrationPanel';
import RegistrationNotifications from '../components/RegistrationNotifications';
import AdminUsersPanel from '../components/AdminUsersPanel';
import { 
    CogIcon,
    UsersIcon,
    ClipboardDocumentListIcon,
    BellIcon
} from '@heroicons/react/24/outline';

interface AdminUser {
    walletAddress: string;
    role: string;
    name: string;
    token: string;
}

const AdminPanel: React.FC = () => {
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [currentView, setCurrentView] = useState<'overview' | 'registrations' | 'users'>('overview');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        pendingRequests: 0,
        totalUsers: 0,
        todayRequests: 0
    });

    /**
     * Conectar y autenticar como admin
     */
    const connectAsAdmin = async (): Promise<void> => {
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
            const adminWallet = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';

            // Verificar que sea el admin principal
            if (walletAddress.toLowerCase() !== adminWallet.toLowerCase()) {
                toast.error('Solo el administrador principal puede acceder a este panel');
                return;
            }

            // Crear mensaje para firmar
            const message = `Login to Food Traceability System as Admin\nTimestamp: ${Date.now()}`;
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
                    role: 'admin'
                })
            });

            const data = await response.json();

            if (data.success) {
                const user: AdminUser = {
                    walletAddress,
                    role: 'admin',
                    name: 'Administrador Principal',
                    token: data.data.token
                };

                setAdminUser(user);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('adminSession', JSON.stringify(user));
                }
                toast.success('¡Bienvenido, Administrador!');
                
                // Cargar estadísticas iniciales
                await loadDashboardStats(user.token);
                
            } else {
                toast.error(data.message || 'Error en autenticación');
            }

        } catch (error: any) {
            console.error('❌ Error conectando como admin:', error);
            toast.error('Error conectando como administrador');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar estadísticas del dashboard
     */
    const loadDashboardStats = async (token: string): Promise<void> => {
        try {
            // Cargar estadísticas desde localStorage (simulando servidor)
            const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
            const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            
            const pendingCount = pendingRequests.filter((req: any) => req.status === 'pending').length;
            
            const today = new Date().toDateString();
            const todayRequests = pendingRequests.filter((req: any) => 
                new Date(req.requestedAt).toDateString() === today
            ).length;

            setStats({
                pendingRequests: pendingCount,
                totalUsers: approvedUsers.length + 1, // +1 para el admin
                todayRequests
            });
            
            console.log(`📊 Stats: ${pendingCount} pendientes, ${approvedUsers.length + 1} usuarios, ${todayRequests} hoy`);
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    /**
     * Cerrar sesión
     */
    const logout = (): void => {
        setAdminUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('adminSession');
        }
        toast.success('Sesión cerrada');
    };

    /**
     * Manejar procesamiento de solicitudes
     */
    const handleRequestProcessed = (requestId: string, status: 'approved' | 'rejected'): void => {
        toast.success(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`);
        
        // Actualizar estadísticas
        if (adminUser) {
            loadDashboardStats(adminUser.token);
        }
    };

    // Verificar sesión existente al cargar
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSession = localStorage.getItem('adminSession');
            if (savedSession) {
                try {
                    const user = JSON.parse(savedSession);
                    setAdminUser(user);
                    loadDashboardStats(user.token);
                } catch (error) {
                    localStorage.removeItem('adminSession');
                }
            }
        }
    }, []);

    // Si no está autenticado, mostrar pantalla de login
    if (!adminUser) {
        return (
            <>
                <Head>
                    <title>Panel de Administración - Food Traceability</title>
                    <meta name="description" content="Panel de administración del sistema de trazabilidad" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>

                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                        <div className="text-center">
                            <CogIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Panel de Administración
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Conecta tu wallet de administrador para gestionar el sistema
                            </p>
                            
                            <button
                                onClick={connectAsAdmin}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Conectando...' : 'Conectar como Administrador'}
                            </button>

                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Wallet requerida:</strong><br />
                                    0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d
                                </p>
                            </div>

                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="text-gray-500 hover:text-gray-700 text-sm"
                                >
                                    ← Volver al inicio
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
                <title>Panel Admin - Food Traceability</title>
                <meta name="description" content="Panel de administración - Gestión de solicitudes" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div className="flex items-center space-x-4">
                                <CogIcon className="h-8 w-8 text-blue-600" />
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        Panel de Administración
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {adminUser.name} • {adminUser.walletAddress.slice(0, 10)}...
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Navegación */}
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    ← Inicio
                                </button>
                                
                                <button
                                    onClick={() => window.location.href = '/admin'}
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard Admin
                                </button>

                                {/* Notificaciones */}
                                <RegistrationNotifications
                                    adminToken={adminUser.token}
                                    onViewRequests={() => setCurrentView('registrations')}
                                />

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
                                onClick={() => setCurrentView('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    currentView === 'overview'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Resumen
                            </button>
                            <button
                                onClick={() => setCurrentView('registrations')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    currentView === 'registrations'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <ClipboardDocumentListIcon className="h-4 w-4 inline mr-1" />
                                Solicitudes de Registro
                                {stats.pendingRequests > 0 && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {stats.pendingRequests}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setCurrentView('users')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    currentView === 'users'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <UsersIcon className="h-4 w-4 inline mr-1" />
                                Usuarios
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    {currentView === 'overview' && (
                        <div className="px-4 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Estadísticas */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center">
                                        <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-500">Solicitudes Pendientes</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center">
                                        <UsersIcon className="h-8 w-8 text-green-600" />
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-500">Usuarios Totales</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center">
                                        <BellIcon className="h-8 w-8 text-yellow-600" />
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-500">Solicitudes Hoy</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.todayRequests}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setCurrentView('registrations')}
                                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                                    >
                                        <h3 className="font-medium text-gray-900">Revisar Solicitudes</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Gestionar solicitudes de registro pendientes
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => setCurrentView('users')}
                                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                                    >
                                        <h3 className="font-medium text-gray-900">Gestionar Usuarios</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Ver y administrar usuarios del sistema
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentView === 'registrations' && (
                        <AdminRegistrationPanel
                            adminToken={adminUser.token}
                            onRequestProcessed={handleRequestProcessed}
                        />
                    )}

                    {currentView === 'users' && (
                        <AdminUsersPanel adminToken={adminUser.token} />
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminPanel;
/**
 * Página de Configuración del Administrador
 * Ruta: /admin/settings
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
    CogIcon,
    ArrowLeftIcon,
    ShieldCheckIcon,
    BellIcon,
    ServerIcon,
    CircleStackIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SystemSettings {
    notifications: {
        emailEnabled: boolean;
        smsEnabled: boolean;
        systemAlerts: boolean;
        userRegistration: boolean;
    };
    security: {
        sessionTimeout: number;
        maxLoginAttempts: number;
        requireTwoFactor: boolean;
        certificateValidation: boolean;
    };
    blockchain: {
        networkUrl: string;
        gasLimit: number;
        confirmations: number;
        autoBackup: boolean;
    };
    general: {
        systemName: string;
        timezone: string;
        language: string;
        dataRetention: number;
    };
}

const AdminSettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>({
        notifications: {
            emailEnabled: true,
            smsEnabled: false,
            systemAlerts: true,
            userRegistration: true
        },
        security: {
            sessionTimeout: 30,
            maxLoginAttempts: 3,
            requireTwoFactor: false,
            certificateValidation: true
        },
        blockchain: {
            networkUrl: 'http://localhost:8545',
            gasLimit: 500000,
            confirmations: 3,
            autoBackup: true
        },
        general: {
            systemName: 'Food Traceability System',
            timezone: 'Europe/Madrid',
            language: 'es-ES',
            dataRetention: 365
        }
    });
    
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'blockchain'>('general');
    const [lastUpdate, setLastUpdate] = useState<string>('');

    /**
     * Cargar configuración guardada
     */
    const loadSettings = (): void => {
        try {
            const savedSettings = localStorage.getItem('adminSettings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
                console.log('⚙️ Configuración cargada desde localStorage');
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    };

    /**
     * Guardar configuración
     */
    const saveSettings = async (): Promise<void> => {
        try {
            setLoading(true);
            
            // Guardar en localStorage (en un caso real sería una API)
            localStorage.setItem('adminSettings', JSON.stringify(settings));
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Actualizar fecha de última actualización
            setLastUpdate(new Date().toLocaleString('es-ES'));
            
            toast.success('Configuración guardada exitosamente');
            console.log('💾 Configuración guardada');
            
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            toast.error('Error guardando la configuración');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Actualizar configuración
     */
    const updateSetting = (section: keyof SystemSettings, key: string, value: any): void => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    /**
     * Resetear configuración
     */
    const resetSettings = (): void => {
        if (confirm('¿Estás seguro de que quieres resetear toda la configuración?')) {
            localStorage.removeItem('adminSettings');
            window.location.reload();
        }
    };

    // Cargar configuración al montar
    useEffect(() => {
        loadSettings();
        // Establecer fecha solo en el cliente para evitar errores de hidratación
        setLastUpdate(new Date().toLocaleString('es-ES'));
    }, []);

    const tabs = [
        { id: 'general', name: 'General', icon: CogIcon },
        { id: 'security', name: 'Seguridad', icon: ShieldCheckIcon },
        { id: 'notifications', name: 'Notificaciones', icon: BellIcon },
        { id: 'blockchain', name: 'Blockchain', icon: ServerIcon }
    ];

    return (
        <>
            <Head>
                <title>Configuración - Panel de Administración</title>
                <meta name="description" content="Configuración del sistema de administración" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <Link href="/admin" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                    <span>Dashboard Admin</span>
                                </Link>
                                
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                                        <CogIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-semibold text-gray-900">Configuración del Sistema</h1>
                                        <p className="text-sm text-gray-500">Ajustes y preferencias</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={resetSettings}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Resetear
                                </button>
                                <button
                                    onClick={saveSettings}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div className="px-4 py-6">
                        
                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow mb-8">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8" aria-label="Tabs">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                                    activeTab === tab.id
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <Icon className="h-5 w-5" />
                                                <span>{tab.name}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="p-6">
                                {/* Tab General */}
                                {activeTab === 'general' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Configuración General</h3>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Nombre del Sistema
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.general.systemName}
                                                    onChange={(e) => updateSetting('general', 'systemName', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Zona Horaria
                                                </label>
                                                <select
                                                    value={settings.general.timezone}
                                                    onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                                                    <option value="UTC">UTC (GMT+0)</option>
                                                    <option value="America/New_York">Nueva York (GMT-5)</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Idioma
                                                </label>
                                                <select
                                                    value={settings.general.language}
                                                    onChange={(e) => updateSetting('general', 'language', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="es-ES">Español</option>
                                                    <option value="en-US">English</option>
                                                    <option value="fr-FR">Français</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Retención de Datos (días)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.general.dataRetention}
                                                    onChange={(e) => updateSetting('general', 'dataRetention', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab Seguridad */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Configuración de Seguridad</h3>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Timeout de Sesión (minutos)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.security.sessionTimeout}
                                                    onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Máximo Intentos de Login
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.security.maxLoginAttempts}
                                                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Autenticación de Dos Factores</label>
                                                    <p className="text-sm text-gray-500">Requerir 2FA para todos los usuarios</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.security.requireTwoFactor}
                                                    onChange={(e) => updateSetting('security', 'requireTwoFactor', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Validación de Certificados</label>
                                                    <p className="text-sm text-gray-500">Verificar certificados X.509 automáticamente</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.security.certificateValidation}
                                                    onChange={(e) => updateSetting('security', 'certificateValidation', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab Notificaciones */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Configuración de Notificaciones</h3>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Notificaciones por Email</label>
                                                    <p className="text-sm text-gray-500">Enviar notificaciones importantes por correo</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications.emailEnabled}
                                                    onChange={(e) => updateSetting('notifications', 'emailEnabled', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Notificaciones SMS</label>
                                                    <p className="text-sm text-gray-500">Enviar alertas críticas por SMS</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications.smsEnabled}
                                                    onChange={(e) => updateSetting('notifications', 'smsEnabled', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Alertas del Sistema</label>
                                                    <p className="text-sm text-gray-500">Notificar sobre problemas del sistema</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications.systemAlerts}
                                                    onChange={(e) => updateSetting('notifications', 'systemAlerts', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Registro de Usuarios</label>
                                                    <p className="text-sm text-gray-500">Notificar sobre nuevos registros</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.notifications.userRegistration}
                                                    onChange={(e) => updateSetting('notifications', 'userRegistration', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab Blockchain */}
                                {activeTab === 'blockchain' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Configuración de Blockchain</h3>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="lg:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    URL de la Red
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.blockchain.networkUrl}
                                                    onChange={(e) => updateSetting('blockchain', 'networkUrl', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Límite de Gas
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.blockchain.gasLimit}
                                                    onChange={(e) => updateSetting('blockchain', 'gasLimit', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirmaciones Requeridas
                                                </label>
                                                <input
                                                    type="number"
                                                    value={settings.blockchain.confirmations}
                                                    onChange={(e) => updateSetting('blockchain', 'confirmations', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Backup Automático</label>
                                                <p className="text-sm text-gray-500">Realizar backup automático de datos críticos</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={settings.blockchain.autoBackup}
                                                onChange={(e) => updateSetting('blockchain', 'autoBackup', e.target.checked)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Estado de Configuración */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de la Configuración</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3">
                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                    <span className="text-sm text-gray-700">Configuración válida</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <CircleStackIcon className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm text-gray-700">Datos sincronizados</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <ClockIcon className="h-5 w-5 text-gray-600" />
                                    <span className="text-sm text-gray-700">Última actualización: {lastUpdate || 'Cargando...'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminSettingsPage;
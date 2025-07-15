/**
 * Página de Auditoría del Administrador
 * Ruta: /admin/audit
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
    ShieldCheckIcon,
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    CalendarIcon,
    UserIcon,
    DocumentTextIcon,
    LockClosedIcon,
    ComputerDesktopIcon
} from '@heroicons/react/24/outline';

interface AuditLog {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    resource: string;
    outcome: 'success' | 'warning' | 'error';
    ipAddress: string;
    userAgent: string;
    details?: string;
}

interface SecurityEvent {
    id: string;
    timestamp: string;
    type: 'login_attempt' | 'permission_denied' | 'data_access' | 'configuration_change';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    user?: string;
    ipAddress: string;
}

const AdminAuditPage: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'logs' | 'security' | 'analytics'>('logs');
    const [dateFilter, setDateFilter] = useState('7'); // últimos 7 días
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    /**
     * Generar logs de auditoría simulados
     */
    const generateMockAuditLogs = (): AuditLog[] => {
        const actions = [
            'Login exitoso',
            'Aprobación de solicitud de registro',
            'Rechazo de solicitud de registro',
            'Configuración del sistema actualizada',
            'Generación de reporte',
            'Acceso al panel de usuarios',
            'Cambio de rol de usuario',
            'Revocación de certificado',
            'Backup de datos',
            'Login fallido'
        ];
        
        const users = [
            'admin@foodtraceability.com',
            'sistema@blockchain.local',
            'supervisor@audit.com'
        ];
        
        const resources = [
            '/admin-panel',
            '/admin/settings',
            '/admin/reports',
            '/api/registration/approve',
            '/api/registration/reject',
            '/api/users/update-role'
        ];

        const logs: AuditLog[] = [];
        const now = new Date();
        
        for (let i = 0; i < 25; i++) {
            const timestamp = new Date(now.getTime() - (Math.random() * 7 * 24 * 60 * 60 * 1000));
            const action = actions[Math.floor(Math.random() * actions.length)];
            const outcome: 'success' | 'warning' | 'error' = 
                action.includes('fallido') ? 'error' :
                action.includes('Rechazo') ? 'warning' : 'success';
            
            logs.push({
                id: `audit-${i + 1}`,
                timestamp: timestamp.toISOString(),
                user: users[Math.floor(Math.random() * users.length)],
                action,
                resource: resources[Math.floor(Math.random() * resources.length)],
                outcome,
                ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                userAgent: 'Mozilla/5.0 (Chrome/91.0)',
                details: action.includes('Login fallido') ? 'Contraseña incorrecta' : undefined
            });
        }
        
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    /**
     * Generar eventos de seguridad simulados
     */
    const generateMockSecurityEvents = (): SecurityEvent[] => {
        const events: SecurityEvent[] = [
            {
                id: 'sec-1',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                type: 'login_attempt',
                severity: 'medium',
                description: 'Múltiples intentos de login fallidos desde IP sospechosa',
                user: 'unknown',
                ipAddress: '203.0.113.42'
            },
            {
                id: 'sec-2',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                type: 'permission_denied',
                severity: 'low',
                description: 'Acceso denegado a recurso administrativo',
                user: 'user@example.com',
                ipAddress: '192.168.1.100'
            },
            {
                id: 'sec-3',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                type: 'configuration_change',
                severity: 'high',
                description: 'Configuración de seguridad modificada',
                user: 'admin@foodtraceability.com',
                ipAddress: '192.168.1.10'
            },
            {
                id: 'sec-4',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'data_access',
                severity: 'critical',
                description: 'Acceso a datos sensibles fuera del horario laboral',
                user: 'supervisor@audit.com',
                ipAddress: '10.0.0.50'
            }
        ];
        
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    /**
     * Cargar datos de auditoría
     */
    const loadAuditData = (): void => {
        try {
            setLoading(true);
            
            // Generar datos simulados
            const logs = generateMockAuditLogs();
            const events = generateMockSecurityEvents();
            
            // Filtrar por fecha si es necesario
            const daysToFilter = parseInt(dateFilter);
            const cutoffDate = new Date(Date.now() - daysToFilter * 24 * 60 * 60 * 1000);
            
            const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);
            const filteredEvents = events.filter(event => new Date(event.timestamp) > cutoffDate);
            
            setAuditLogs(filteredLogs);
            setSecurityEvents(filteredEvents);
            
            console.log(`🔍 Datos de auditoría cargados: ${filteredLogs.length} logs, ${filteredEvents.length} eventos`);
            
        } catch (error) {
            console.error('❌ Error cargando datos de auditoría:', error);
            toast.error('Error cargando datos de auditoría');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Obtener icono para el resultado
     */
    const getOutcomeIcon = (outcome: string) => {
        switch (outcome) {
            case 'success':
                return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
            case 'warning':
                return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
            case 'error':
                return <XCircleIcon className="h-5 w-5 text-red-600" />;
            default:
                return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
        }
    };

    /**
     * Obtener color para la severidad
     */
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-100 text-red-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Formatear fecha
     */
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Cargar datos al montar y cuando cambie el filtro
    useEffect(() => {
        loadAuditData();
    }, [dateFilter]);

    return (
        <>
            <Head>
                <title>Auditoría - Panel de Administración</title>
                <meta name="description" content="Logs de auditoría y eventos de seguridad" />
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
                                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                                        <ShieldCheckIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-semibold text-gray-900">Auditoría del Sistema</h1>
                                        <p className="text-sm text-gray-500">Logs y eventos de seguridad</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                                    <select
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="1">Último día</option>
                                        <option value="7">Últimos 7 días</option>
                                        <option value="30">Últimos 30 días</option>
                                        <option value="90">Últimos 90 días</option>
                                    </select>
                                </div>
                                
                                <button
                                    onClick={loadAuditData}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Actualizando...' : 'Actualizar'}
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
                                    <button
                                        onClick={() => setActiveTab('logs')}
                                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'logs'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <DocumentTextIcon className="h-5 w-5" />
                                        <span>Logs de Auditoría</span>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                            {auditLogs.length}
                                        </span>
                                    </button>
                                    
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'security'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <LockClosedIcon className="h-5 w-5" />
                                        <span>Eventos de Seguridad</span>
                                        <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                                            {securityEvents.length}
                                        </span>
                                    </button>
                                    
                                    <button
                                        onClick={() => setActiveTab('analytics')}
                                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                            activeTab === 'analytics'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <ComputerDesktopIcon className="h-5 w-5" />
                                        <span>Análisis</span>
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {/* Tab Logs de Auditoría */}
                                {activeTab === 'logs' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">Logs de Auditoría</h3>
                                        
                                        {loading ? (
                                            <div className="text-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                <p className="text-gray-500 mt-2">Cargando logs...</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-300">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Fecha/Hora
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Usuario
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Acción
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Resultado
                                                            </th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Acciones
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {auditLogs.map((log) => (
                                                            <tr key={log.id} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {formatDate(log.timestamp)}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    <div className="flex items-center">
                                                                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                        {log.user}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">{log.ipAddress}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                                    <div>{log.action}</div>
                                                                    <div className="text-xs text-gray-500">{log.resource}</div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        {getOutcomeIcon(log.outcome)}
                                                                        <span className="ml-2 text-sm capitalize">{log.outcome}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedLog(log);
                                                                            setShowDetailsModal(true);
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        <EyeIcon className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab Eventos de Seguridad */}
                                {activeTab === 'security' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-gray-900">Eventos de Seguridad</h3>
                                        
                                        <div className="space-y-4">
                                            {securityEvents.map((event) => (
                                                <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                                                                    {event.severity.toUpperCase()}
                                                                </span>
                                                                <span className="text-sm text-gray-500">
                                                                    {formatDate(event.timestamp)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-900 mt-2">
                                                                {event.description}
                                                            </p>
                                                            <div className="mt-2 text-xs text-gray-500">
                                                                <span>IP: {event.ipAddress}</span>
                                                                {event.user && <span className="ml-4">Usuario: {event.user}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            {event.severity === 'critical' && (
                                                                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                                                            )}
                                                            {event.severity === 'high' && (
                                                                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tab Análisis */}
                                {activeTab === 'analytics' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Análisis de Seguridad</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h4 className="font-medium text-blue-900">Total de Eventos</h4>
                                                <p className="text-2xl font-bold text-blue-600">{auditLogs.length}</p>
                                                <p className="text-sm text-blue-700">En los últimos {dateFilter} días</p>
                                            </div>
                                            
                                            <div className="bg-red-50 p-4 rounded-lg">
                                                <h4 className="font-medium text-red-900">Eventos Críticos</h4>
                                                <p className="text-2xl font-bold text-red-600">
                                                    {securityEvents.filter(e => e.severity === 'critical').length}
                                                </p>
                                                <p className="text-sm text-red-700">Requieren atención inmediata</p>
                                            </div>
                                            
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <h4 className="font-medium text-green-900">Tasa de Éxito</h4>
                                                <p className="text-2xl font-bold text-green-600">
                                                    {((auditLogs.filter(l => l.outcome === 'success').length / auditLogs.length) * 100).toFixed(1)}%
                                                </p>
                                                <p className="text-sm text-green-700">Operaciones exitosas</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Modal de Detalles */}
                {showDetailsModal && selectedLog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full m-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Detalles del Log</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ID</label>
                                    <p className="text-sm text-gray-900 font-mono">{selectedLog.id}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Fecha y Hora</label>
                                    <p className="text-sm text-gray-900">{formatDate(selectedLog.timestamp)}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Usuario</label>
                                    <p className="text-sm text-gray-900">{selectedLog.user}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Acción</label>
                                    <p className="text-sm text-gray-900">{selectedLog.action}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Recurso</label>
                                    <p className="text-sm text-gray-900 font-mono">{selectedLog.resource}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dirección IP</label>
                                    <p className="text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                                    <p className="text-sm text-gray-900 font-mono text-xs">{selectedLog.userAgent}</p>
                                </div>
                                
                                {selectedLog.details && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Detalles</label>
                                        <p className="text-sm text-gray-900">{selectedLog.details}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminAuditPage;
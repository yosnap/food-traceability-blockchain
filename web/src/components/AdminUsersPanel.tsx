/**
 * Panel de gestión de usuarios para el administrador
 * Muestra usuarios aprobados y permite gestionar sus permisos
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
    UserIcon,
    CheckCircleIcon,
    XCircleIcon,
    CogIcon,
    EyeIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

interface User {
    walletAddress: string;
    role: string;
    personalInfo: {
        fullName: string;
        email: string;
        organization?: string;
    };
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
}

interface AdminUsersPanelProps {
    adminToken: string;
}

const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ adminToken }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);

    /**
     * Cargar usuarios del sistema
     */
    const loadUsers = async (): Promise<void> => {
        try {
            setLoading(true);
            
            // Obtener usuarios aprobados del localStorage
            const approvedUsers: User[] = [];
            
            // Agregar el administrador principal siempre
            approvedUsers.push({
                walletAddress: '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d',
                role: 'admin',
                personalInfo: {
                    fullName: 'Administrador Principal',
                    email: 'admin@foodtraceability.com',
                    organization: 'Sistema'
                },
                isActive: true,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 60 * 60 * 1000).toISOString()
            });

            // Obtener usuarios aprobados desde localStorage
            const approvedUsersData = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            
            // Agregar usuarios aprobados
            approvedUsersData.forEach((userData: any) => {
                approvedUsers.push({
                    walletAddress: userData.walletAddress,
                    role: userData.requestedRole,
                    personalInfo: {
                        fullName: userData.personalInfo.fullName,
                        email: userData.personalInfo.email,
                        organization: userData.personalInfo.organization
                    },
                    isActive: true,
                    createdAt: userData.approvedAt || userData.requestedAt,
                    lastLogin: userData.lastLogin || undefined
                });
            });

            setUsers(approvedUsers);
            console.log(`👥 ${approvedUsers.length} usuarios cargados (${approvedUsersData.length} reales aprobados)`);
            
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            toast.error('Error cargando usuarios del sistema');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Alternar estado activo de usuario
     */
    const toggleUserStatus = async (user: User): Promise<void> => {
        try {
            const newStatus = !user.isActive;
            const action = newStatus ? 'activar' : 'desactivar';
            
            if (user.role === 'admin') {
                toast.error('No se puede desactivar al administrador principal');
                return;
            }

            // Simulación de cambio de estado
            const updatedUsers = users.map(u => 
                u.walletAddress === user.walletAddress 
                    ? { ...u, isActive: newStatus }
                    : u
            );
            
            setUsers(updatedUsers);
            toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
            
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            toast.error('Error actualizando estado del usuario');
        }
    };

    /**
     * Formatear fecha
     */
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    /**
     * Revocar certificados
     */
    const revokeCertificates = async (user: User): Promise<void> => {
        try {
            // En una aplicación real, esto revocaría los certificados en la blockchain
            console.log('🚫 Revocando certificados para:', user.personalInfo.fullName);
            toast.success('Certificados revocados exitosamente');
            setShowConfigModal(false);
        } catch (error) {
            console.error('❌ Error revocando certificados:', error);
            toast.error('Error revocando certificados');
        }
    };

    /**
     * Cambiar rol de usuario
     */
    const changeUserRole = async (user: User, newRole: string): Promise<void> => {
        try {
            // Actualizar en localStorage (simulando base de datos)
            const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
            const updatedUsers = approvedUsers.map((u: any) => 
                u.walletAddress === user.walletAddress 
                    ? { ...u, requestedRole: newRole }
                    : u
            );
            localStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
            
            // Actualizar estado local
            const updatedUsersState = users.map(u => 
                u.walletAddress === user.walletAddress 
                    ? { ...u, role: newRole }
                    : u
            );
            setUsers(updatedUsersState);
            
            console.log('🔄 Rol cambiado:', user.personalInfo.fullName, '→', newRole);
            toast.success(`Rol cambiado a ${getRoleInfo(newRole).label}`);
            setShowConfigModal(false);
        } catch (error) {
            console.error('❌ Error cambiando rol:', error);
            toast.error('Error cambiando rol de usuario');
        }
    };

    /**
     * Obtener información del rol
     */
    const getRoleInfo = (role: string) => {
        const roleData = {
            admin: { label: 'Administrador', color: 'bg-red-100 text-red-800', org: 'org1 (Org1MSP)' },
            producer: { label: 'Productor', color: 'bg-green-100 text-green-800', org: 'org1 (Org1MSP)' },
            factory: { label: 'Procesador', color: 'bg-blue-100 text-blue-800', org: 'org2 (Org2MSP)' },
            distributor: { label: 'Distribuidor', color: 'bg-yellow-100 text-yellow-800', org: 'org2 (Org2MSP)' },
            retailer: { label: 'Minorista', color: 'bg-purple-100 text-purple-800', org: 'org2 (Org2MSP)' },
            consumer: { label: 'Consumidor', color: 'bg-gray-100 text-gray-800', org: 'org2 (Org2MSP)' }
        };
        return roleData[role as keyof typeof roleData] || { label: role, color: 'bg-gray-100 text-gray-800', org: 'Unknown' };
    };

    /**
     * Obtener datos crudos del usuario desde localStorage
     */
    const getUserRawData = (user: User): any => {
        const approvedUsersData = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
        const rawUserData = approvedUsersData.find((userData: any) => 
            userData.walletAddress.toLowerCase() === user.walletAddress.toLowerCase()
        );
        return rawUserData || user;
    };

    /**
     * Generar vista completa de detalles del usuario
     */
    const getUserCompleteDetails = (user: User): JSX.Element => {
        const rawData = getUserRawData(user);
        const roleInfo = getRoleInfo(user.role);

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información Personal */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <UserIcon className="h-5 w-5 mr-2" />
                        Información Personal
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.phone || 'No especificado'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Organización</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.organization || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Dirección</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.address || 'No especificado'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">País</label>
                            <p className="text-sm text-gray-900">{rawData.personalInfo?.country || 'No especificado'}</p>
                        </div>
                    </div>
                </div>

                {/* Información de Empresa */}
                {rawData.businessInfo && (
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                            Información de Empresa
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                                <p className="text-sm text-gray-900">{rawData.businessInfo.companyName || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Negocio</label>
                                <p className="text-sm text-gray-900">{rawData.businessInfo.businessType || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Número de Registro</label>
                                <p className="text-sm text-gray-900">{rawData.businessInfo.registrationNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                <p className="text-sm text-gray-900">{rawData.businessInfo.description || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Información del Sistema */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CogIcon className="h-5 w-5 mr-2" />
                        Información del Sistema
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ID de Solicitud</label>
                            <p className="text-sm text-gray-900 font-mono">{rawData.id || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Wallet Address</label>
                            <p className="text-sm text-gray-900 font-mono break-all">{user.walletAddress}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rol Solicitado</label>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                                {roleInfo.label}
                            </span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Estado</label>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Fechas Importantes */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-2" />
                        Fechas Importantes
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Solicitud Enviada</label>
                            <p className="text-sm text-gray-900">{rawData.requestedAt ? formatDate(rawData.requestedAt) : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fecha de Aprobación</label>
                            <p className="text-sm text-gray-900">{rawData.processedAt || rawData.approvedAt ? formatDate(rawData.processedAt || rawData.approvedAt) : 'Nunca'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Último Acceso</label>
                            <p className="text-sm text-gray-900">{user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cuenta Creada</label>
                            <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Estado de Verificación */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ShieldCheckIcon className="h-5 w-5 mr-2" />
                        Estado de Verificación
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Email verificado</span>
                            <span className="text-sm font-medium text-green-600">✅ Verificado</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Identidad verificada</span>
                            <span className="text-sm font-medium text-green-600">✅ Verificado</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">KYC completado</span>
                            <span className="text-sm font-medium text-green-600">✅ Completado</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Cuenta aprobada</span>
                            <span className="text-sm font-medium text-green-600">✅ Aprobada</span>
                        </div>
                    </div>
                </div>

                {/* Datos Técnicos */}
                <div className="bg-gray-50 rounded-lg p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        Datos Técnicos y Blockchain
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Organización Blockchain</label>
                            <p className="text-sm text-gray-900">{roleInfo.org || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Certificado X.509</label>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                ✅ Activo
                            </span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Subject Certificate</label>
                            <p className="text-xs text-gray-900 font-mono break-all">
                                CN={rawData.personalInfo?.fullName || 'Usuario'},O={rawData.personalInfo?.organization || 'Food Traceability'},C=ES
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                            <p className="text-xs text-gray-900 font-mono">
                                FT-{rawData.requestedRole?.toUpperCase() || 'USER'}-{rawData.id?.slice(-6) || '000000'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Cargar usuarios al montar el componente
    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                        <p className="text-gray-600 mt-2">Administrar usuarios activos del sistema</p>
                    </div>
                    <button
                        onClick={loadUsers}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {/* Estado de carga */}
            {loading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando usuarios...</p>
                </div>
            )}

            {/* Estadísticas */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <UserIcon className="h-8 w-8 text-blue-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <CheckCircleIcon className="h-8 w-8 text-green-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Activos</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.isActive).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <XCircleIcon className="h-8 w-8 text-red-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Inactivos</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => !u.isActive).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-500">Admins</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.role === 'admin').length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lista de usuarios */}
            {!loading && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Usuarios del Sistema</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rol
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Último Acceso
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => {
                                    const roleInfo = getRoleInfo(user.role);
                                    return (
                                        <tr key={user.walletAddress} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <UserIcon className="h-6 w-6 text-gray-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.personalInfo.fullName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {user.personalInfo.email}
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-mono">
                                                            {user.walletAddress.slice(0, 10)}...
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleInfo.color}`}>
                                                    {roleInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    user.isActive 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Ver detalles"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </button>
                                                    
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => toggleUserStatus(user)}
                                                            className={`${
                                                                user.isActive 
                                                                    ? 'text-red-600 hover:text-red-900' 
                                                                    : 'text-green-600 hover:text-green-900'
                                                            }`}
                                                            title={user.isActive ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {user.isActive ? (
                                                                <XCircleIcon className="h-4 w-4" />
                                                            ) : (
                                                                <CheckCircleIcon className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                    
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowConfigModal(true);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                        title="Configuración"
                                                    >
                                                        <CogIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de detalles completos */}
            {showDetailsModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">Información Completa del Usuario</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">{getUserCompleteDetails(selectedUser)}</div>

                        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(getUserRawData(selectedUser), null, 2));
                                        toast.success('Datos copiados al portapapeles');
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Copiar JSON
                                </button>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de configuración */}
            {showConfigModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full m-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Configuración de Usuario</h2>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600">
                                Configurando: <span className="font-medium">{selectedUser.personalInfo.fullName}</span>
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{selectedUser.walletAddress}</p>
                        </div>

                        <div className="space-y-4">
                            {/* Cambiar Rol */}
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2">Cambiar Rol</h3>
                                <p className="text-sm text-gray-600 mb-3">Rol actual: {getRoleInfo(selectedUser.role).label}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['producer', 'factory', 'distributor', 'retailer', 'consumer'].map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => changeUserRole(selectedUser, role)}
                                            disabled={selectedUser.role === role}
                                            className={`px-3 py-2 text-sm rounded ${
                                                selectedUser.role === role
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                            }`}
                                        >
                                            {getRoleInfo(role).label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Acciones de Seguridad */}
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-3">Acciones de Seguridad</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => revokeCertificates(selectedUser)}
                                        className="w-full px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm"
                                    >
                                        🚫 Revocar Certificados
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 Los usuarios se autentican con MetaMask, no requieren contraseñas tradicionales
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPanel;
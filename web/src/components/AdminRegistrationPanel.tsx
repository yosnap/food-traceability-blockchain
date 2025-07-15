/**
 * Panel de administración para gestionar solicitudes de registro
 * Permite al admin ver, aprobar y rechazar solicitudes
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
    UserPlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOfficeIcon,
    GlobeAmericasIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

interface RegistrationRequest {
    id: string;
    walletAddress: string;
    requestedRole: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone?: string;
        organization?: string;
        address?: string;
        country?: string;
    };
    businessInfo?: {
        companyName?: string;
        businessType?: string;
        registrationNumber?: string;
        description?: string;
    };
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
    processedBy?: string;
    adminNotes?: string;
}

interface AdminRegistrationPanelProps {
    adminToken: string;
    onRequestProcessed?: (requestId: string, status: 'approved' | 'rejected') => void;
}

const AdminRegistrationPanel: React.FC<AdminRegistrationPanelProps> = ({ 
    adminToken, 
    onRequestProcessed 
}) => {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const roleLabels = {
        producer: 'Productor',
        factory: 'Procesador',
        distributor: 'Distribuidor',
        retailer: 'Minorista',
        consumer: 'Consumidor'
    };

    /**
     * Cargar solicitudes pendientes
     */
    const loadPendingRequests = async (): Promise<void> => {
        try {
            setLoading(true);
            
            // Cargar solicitudes desde localStorage (simulando que vienen del servidor)
            const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
            
            // Filtrar solo las pendientes
            const filteredRequests = pendingRequests.filter((req: any) => req.status === 'pending');
            
            setRequests(filteredRequests);
            console.log(`📋 ${filteredRequests.length} solicitudes pendientes cargadas desde localStorage`);
            
        } catch (error) {
            console.error('❌ Error cargando solicitudes:', error);
            toast.error('Error cargando solicitudes pendientes');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Aprobar solicitud
     */
    const approveRequest = async (): Promise<void> => {
        if (!selectedRequest) return;

        try {
            setProcessing(true);

            const response = await fetch(`/api/registration/admin/approve/${selectedRequest.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminNotes: adminNotes.trim() || undefined,
                    createUserImmediately: true
                })
            });

            const data = await response.json();

            if (data.success) {
                // Mover la solicitud aprobada a la lista de usuarios aprobados
                if (data.data.clientAction === 'moveToApprovedUsers') {
                    const approvedUser = {
                        ...selectedRequest,
                        status: 'approved',
                        approvedAt: data.data.processedAt,
                        adminNotes: data.data.adminNotes
                    };
                    
                    // Guardar en localStorage como usuario aprobado
                    const existingApproved = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
                    existingApproved.push(approvedUser);
                    localStorage.setItem('approvedUsers', JSON.stringify(existingApproved));
                    
                    // Remover de solicitudes pendientes
                    const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
                    const updatedPending = pendingRequests.filter((req: any) => req.id !== selectedRequest.id);
                    localStorage.setItem('pendingRequests', JSON.stringify(updatedPending));
                    
                    console.log('✅ Usuario movido a aprobados:', approvedUser.personalInfo.fullName);
                }
                
                setShowApprovalModal(false);
                setAdminNotes('');
                setSelectedRequest(null);
                await loadPendingRequests(); // Recargar lista
                
                if (onRequestProcessed) {
                    onRequestProcessed(selectedRequest.id, 'approved');
                }
            } else {
                toast.error(data.message || 'Error aprobando solicitud');
            }
        } catch (error) {
            console.error('❌ Error aprobando solicitud:', error);
            toast.error('Error aprobando solicitud');
        } finally {
            setProcessing(false);
        }
    };

    /**
     * Rechazar solicitud
     */
    const rejectRequest = async (): Promise<void> => {
        if (!selectedRequest || !rejectionReason.trim()) return;

        try {
            setProcessing(true);

            const response = await fetch(`/api/registration/admin/reject/${selectedRequest.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: rejectionReason.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                // Remover de solicitudes pendientes
                if (data.data.clientAction === 'removeFromPending') {
                    const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
                    const updatedPending = pendingRequests.filter((req: any) => req.id !== selectedRequest.id);
                    localStorage.setItem('pendingRequests', JSON.stringify(updatedPending));
                    
                    console.log('❌ Solicitud rechazada y removida:', selectedRequest.personalInfo.fullName);
                }
                
                setShowRejectionModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
                await loadPendingRequests(); // Recargar lista
                
                if (onRequestProcessed) {
                    onRequestProcessed(selectedRequest.id, 'rejected');
                }
            } else {
                toast.error(data.message || 'Error rechazando solicitud');
            }
        } catch (error) {
            console.error('❌ Error rechazando solicitud:', error);
            toast.error('Error rechazando solicitud');
        } finally {
            setProcessing(false);
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
     * Obtener información del rol
     */
    const getRoleInfo = (role: string) => {
        const roleData = {
            producer: { label: 'Productor', color: 'bg-green-100 text-green-800', org: 'org1 (Org1MSP)' },
            factory: { label: 'Procesador', color: 'bg-blue-100 text-blue-800', org: 'org2 (Org2MSP)' },
            retailer: { label: 'Minorista', color: 'bg-purple-100 text-purple-800', org: 'org2 (Org2MSP)' },
            consumer: { label: 'Consumidor', color: 'bg-gray-100 text-gray-800', org: 'org2 (Org2MSP)' }
        };
        return roleData[role as keyof typeof roleData] || { label: role, color: 'bg-gray-100 text-gray-800', org: 'Unknown' };
    };

    // Cargar solicitudes al montar el componente
    useEffect(() => {
        loadPendingRequests();
    }, []);

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Registro</h1>
                        <p className="text-gray-600 mt-2">Gestionar solicitudes de acceso al sistema</p>
                    </div>
                    <button
                        onClick={loadPendingRequests}
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
                    <p className="text-gray-500 mt-4">Cargando solicitudes...</p>
                </div>
            )}

            {/* Lista de solicitudes */}
            {!loading && (
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
                            <p className="text-gray-500">Todas las solicitudes han sido procesadas</p>
                        </div>
                    ) : (
                        requests.map((request) => {
                            const roleInfo = getRoleInfo(request.requestedRole);
                            return (
                                <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {request.personalInfo.fullName}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                                                    {roleInfo.label}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                                                    {request.personalInfo.email}
                                                </div>
                                                <div className="flex items-center">
                                                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                                                    {request.personalInfo.organization || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Wallet: {request.walletAddress}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Fecha: {formatDate(request.requestedAt)}
                                                </div>
                                            </div>

                                            {request.businessInfo?.companyName && (
                                                <div className="mt-2 text-sm text-gray-600">
                                                    <strong>Empresa:</strong> {request.businessInfo.companyName}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowDetailsModal(true);
                                                }}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Ver detalles"
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowApprovalModal(true);
                                                }}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                title="Aprobar"
                                            >
                                                <CheckCircleIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowRejectionModal(true);
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Rechazar"
                                            >
                                                <XCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal de detalles */}
            {showDetailsModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Detalles de Solicitud</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircleIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Información personal */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Personal</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.fullName}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Organización</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.organization || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">País</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.country || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Rol Solicitado</label>
                                        <p className="text-sm text-gray-900">{getRoleInfo(selectedRequest.requestedRole).label}</p>
                                    </div>
                                </div>
                                {selectedRequest.personalInfo.address && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.personalInfo.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* Información de empresa */}
                            {selectedRequest.businessInfo && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Información de Empresa</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedRequest.businessInfo.companyName && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                                                <p className="text-sm text-gray-900">{selectedRequest.businessInfo.companyName}</p>
                                            </div>
                                        )}
                                        {selectedRequest.businessInfo.businessType && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Tipo de Negocio</label>
                                                <p className="text-sm text-gray-900">{selectedRequest.businessInfo.businessType}</p>
                                            </div>
                                        )}
                                        {selectedRequest.businessInfo.registrationNumber && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Número de Registro</label>
                                                <p className="text-sm text-gray-900">{selectedRequest.businessInfo.registrationNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedRequest.businessInfo.description && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                            <p className="text-sm text-gray-900">{selectedRequest.businessInfo.description}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Información técnica */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Técnica</h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-medium">Wallet Address:</span> {selectedRequest.walletAddress}
                                    </div>
                                    <div>
                                        <span className="font-medium">Fecha de Solicitud:</span> {formatDate(selectedRequest.requestedAt)}
                                    </div>
                                    <div>
                                        <span className="font-medium">ID de Solicitud:</span> {selectedRequest.id}
                                    </div>
                                    <div>
                                        <span className="font-medium">Organización Target:</span> {getRoleInfo(selectedRequest.requestedRole).org}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setShowApprovalModal(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Aprobar
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setShowRejectionModal(true);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de aprobación */}
            {showApprovalModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
                        <div className="flex items-center mb-4">
                            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                            <h2 className="text-xl font-bold text-gray-900">Aprobar Solicitud</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            ¿Está seguro de que desea aprobar la solicitud de <strong>{selectedRequest.personalInfo.fullName}</strong>?
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notas del Administrador (opcional)
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Comentarios sobre la aprobación..."
                            />
                        </div>

                        <div className="bg-green-50 p-3 rounded-md mb-4">
                            <p className="text-sm text-green-800">
                                <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                                El usuario recibirá una notificación por email y podrá iniciar sesión inmediatamente.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowApprovalModal(false)}
                                disabled={processing}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={approveRequest}
                                disabled={processing}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {processing ? 'Aprobando...' : 'Aprobar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de rechazo */}
            {showRejectionModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
                        <div className="flex items-center mb-4">
                            <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
                            <h2 className="text-xl font-bold text-gray-900">Rechazar Solicitud</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            ¿Está seguro de que desea rechazar la solicitud de <strong>{selectedRequest.personalInfo.fullName}</strong>?
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motivo del Rechazo *
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Explique por qué se rechaza la solicitud..."
                                required
                            />
                        </div>

                        <div className="bg-red-50 p-3 rounded-md mb-4">
                            <p className="text-sm text-red-800">
                                <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                                El usuario recibirá una notificación por email con el motivo del rechazo.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                disabled={processing}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={rejectRequest}
                                disabled={processing || !rejectionReason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing ? 'Rechazando...' : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRegistrationPanel;
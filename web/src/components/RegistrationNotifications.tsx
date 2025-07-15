/**
 * Componente para mostrar notificaciones de nuevas solicitudes de registro
 * Puede usarse en el dashboard del admin
 */

import React, { useState, useEffect } from 'react';
import { 
    BellIcon,
    UserPlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

interface RegistrationNotificationsProps {
    adminToken: string;
    onViewRequests?: () => void;
    pollInterval?: number; // Intervalo de polling en millisegundos (default: 30000 = 30 segundos)
}

interface NotificationData {
    newRequests: number;
    lastCheck: string;
    totalPending: number;
}

const RegistrationNotifications: React.FC<RegistrationNotificationsProps> = ({ 
    adminToken, 
    onViewRequests,
    pollInterval = 30000 
}) => {
    const [notification, setNotification] = useState<NotificationData | null>(null);
    const [showNotification, setShowNotification] = useState(false);
    const [lastKnownCount, setLastKnownCount] = useState(0);

    /**
     * Verificar nuevas solicitudes
     */
    const checkForNewRequests = async (): Promise<void> => {
        try {
            const response = await fetch('/api/registration/admin/requests', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    let currentCount = data.count || 0;
                    
                    // Si el servidor indica que use localStorage, obtener el count real
                    if (data.clientInstruction === 'USE_LOCALSTORAGE') {
                        const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
                        const pendingCount = pendingRequests.filter((req: any) => req.status === 'pending').length;
                        currentCount = pendingCount;
                    }
                    
                    const newRequests = Math.max(0, currentCount - lastKnownCount);

                    setNotification({
                        newRequests,
                        lastCheck: new Date().toISOString(),
                        totalPending: currentCount
                    });

                    // Mostrar notificación si hay nuevas solicitudes
                    if (newRequests > 0 && lastKnownCount > 0) {
                        setShowNotification(true);
                        
                        // Auto-ocultar después de 10 segundos
                        setTimeout(() => {
                            setShowNotification(false);
                        }, 10000);
                    }

                    setLastKnownCount(currentCount);
                }
            }
        } catch (error) {
            console.error('❌ Error verificando solicitudes:', error);
        }
    };

    /**
     * Manejar clic en notificación
     */
    const handleNotificationClick = (): void => {
        setShowNotification(false);
        if (onViewRequests) {
            onViewRequests();
        }
    };

    /**
     * Cerrar notificación
     */
    const closeNotification = (): void => {
        setShowNotification(false);
    };

    // Polling para verificar nuevas solicitudes
    useEffect(() => {
        // Check inicial
        checkForNewRequests();

        // Configurar polling
        const interval = setInterval(checkForNewRequests, pollInterval);

        return () => clearInterval(interval);
    }, [adminToken, pollInterval, lastKnownCount]);

    // Badge persistente con contador
    const PendingBadge = () => {
        const [showDropdown, setShowDropdown] = useState(false);
        
        if (!notification || notification.totalPending === 0) {
            return (
                <div className="relative inline-flex items-center">
                    <BellIcon className="h-6 w-6 text-gray-400" />
                </div>
            );
        }

        return (
            <div className="relative">
                <div 
                    className="relative inline-flex items-center cursor-pointer group"
                    onClick={() => setShowDropdown(!showDropdown)}
                    title={`${notification.totalPending} solicitudes pendientes`}
                >
                    <BellIcon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {notification.totalPending}
                    </span>
                </div>
                
                {/* Dropdown de notificaciones */}
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-medium text-gray-900">Notificaciones</h3>
                                <button
                                    onClick={() => setShowDropdown(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                                    <UserPlusIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {notification.totalPending === 1 
                                                ? '1 nueva solicitud'
                                                : `${notification.totalPending} nuevas solicitudes`
                                            }
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Hay solicitudes de registro pendientes de revisión
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            handleNotificationClick();
                                        }}
                                        className="flex-1 bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700"
                                    >
                                        Ver Solicitudes
                                    </button>
                                    <button
                                        onClick={() => setShowDropdown(false)}
                                        className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 px-3 rounded hover:bg-gray-200"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Notificación emergente para nuevas solicitudes
    const PopupNotification = () => {
        if (!showNotification || !notification || notification.newRequests === 0) return null;

        return (
            <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <UserPlusIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-3 w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {notification.newRequests === 1 
                                    ? 'Nueva solicitud de registro'
                                    : `${notification.newRequests} nuevas solicitudes de registro`
                                }
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                {notification.totalPending === 1
                                    ? '1 solicitud pendiente de revisión'
                                    : `${notification.totalPending} solicitudes pendientes de revisión`
                                }
                            </p>
                            <div className="mt-3 flex space-x-2">
                                <button
                                    onClick={handleNotificationClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                                >
                                    Ver Solicitudes
                                </button>
                                <button
                                    onClick={closeNotification}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={closeNotification}
                                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PendingBadge />
            <PopupNotification />
        </>
    );
};

export default RegistrationNotifications;
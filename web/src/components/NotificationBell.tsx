import { useState, useRef, useEffect } from 'react';
import { BellIcon, ExclamationTriangleIcon, ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { Notification, NotificationStats } from '@/hooks/useNotifications';
import SafeDate from './SafeDate';

interface NotificationBellProps {
  notifications: Notification[];
  stats: NotificationStats;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationBell({ 
  notifications, 
  stats, 
  onMarkAsRead, 
  onMarkAllAsRead 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar notificaciones según el tipo seleccionado
  const filteredNotifications = notifications
    .filter(n => selectedType === 'all' || n.type === selectedType)
    .sort((a, b) => {
      // Ordenar por tipo (crítico primero) y luego por días para vencer
      const typeOrder = { critical: 0, warning: 1, info: 2 };
      if (a.type !== b.type) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.daysToExpire - b.daysToExpire;
    });

  const getNotificationIcon = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <ClockIcon className="w-4 h-4 text-orange-500" />;
      case 'info':
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-orange-500 bg-orange-50';
      case 'info':
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getTypeLabel = (type: 'all' | 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'all':
        return 'Todas';
      case 'critical':
        return 'Críticas';
      case 'warning':
        return 'Advertencias';
      case 'info':
        return 'Informativas';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg transition-colors"
      >
        {stats.unread > 0 ? (
          <BellSolidIcon className="w-6 h-6 text-primary-600" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Badge with notification count */}
        {stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              {stats.unread > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gray-50">
                <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <div className="text-lg font-semibold text-red-600">{stats.critical}</div>
                <div className="text-xs text-red-600">Críticas</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-50">
                <div className="text-lg font-semibold text-orange-600">{stats.warning}</div>
                <div className="text-xs text-orange-600">Advertencias</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <div className="text-lg font-semibold text-blue-600">{stats.info}</div>
                <div className="text-xs text-blue-600">Info</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 mt-3">
              {(['all', 'critical', 'warning', 'info'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedType === type
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay notificaciones {selectedType !== 'all' && `de tipo "${getTypeLabel(selectedType)}"`}</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all ${
                      getNotificationColor(notification.type)
                    } ${
                      !notification.isRead 
                        ? 'shadow-sm hover:shadow-md' 
                        : 'opacity-75'
                    }`}
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.message}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-gray-600">
                            Lote: {notification.batchNumber}
                          </p>
                          <p className="text-xs text-gray-600">
                            Ubicación: {notification.currentLocation}
                          </p>
                          <p className="text-xs text-gray-500">
                            <SafeDate date={notification.timestamp} format="full" />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
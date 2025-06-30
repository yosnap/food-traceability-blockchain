import { useState } from 'react';
import { 
  BellIcon, 
  ExclamationTriangleIcon, 
  ClockIcon, 
  InformationCircleIcon,
  FunnelIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Notification, NotificationStats } from '@/hooks/useNotifications';
import SafeDate from './SafeDate';

interface NotificationPanelProps {
  notifications: Notification[];
  stats: NotificationStats;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationPanel({ 
  notifications, 
  stats, 
  onMarkAsRead, 
  onMarkAllAsRead 
}: NotificationPanelProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // Filtrar notificaciones
  const filteredNotifications = notifications
    .filter(n => {
      const typeMatch = selectedType === 'all' || n.type === selectedType;
      const readMatch = !showOnlyUnread || !n.isRead;
      return typeMatch && readMatch;
    })
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
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ClockIcon className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100';
      case 'info':
        return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
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

  const getTypeCount = (type: 'all' | 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'all':
        return stats.total;
      case 'critical':
        return stats.critical;
      case 'warning':
        return stats.warning;
      case 'info':
        return stats.info;
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BellIcon className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Centro de Notificaciones
          </h3>
          {stats.unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {stats.unread}
            </span>
          )}
        </div>
        
        {stats.unread > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Marcar todas como leídas</span>
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-red-600">Críticas</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.warning}</div>
          <div className="text-sm text-orange-600">Advertencias</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
          <div className="text-sm text-blue-600">Informativas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
          
          {/* Type Filter */}
          <div className="flex space-x-1">
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
                {getTypeLabel(type)} ({getTypeCount(type)})
              </button>
            ))}
          </div>
        </div>

        {/* Unread Filter */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyUnread}
            onChange={(e) => setShowOnlyUnread(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Solo no leídas</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No hay notificaciones
            </h4>
            <p className="text-gray-600">
              {selectedType !== 'all' 
                ? `No hay notificaciones de tipo "${getTypeLabel(selectedType)}"` 
                : showOnlyUnread 
                ? 'No hay notificaciones sin leer'
                : 'Todas las notificaciones aparecerán aquí'
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 cursor-pointer transition-all ${
                getNotificationColor(notification.type)
              } ${
                !notification.isRead 
                  ? 'shadow-sm' 
                  : 'opacity-75'
              }`}
              onClick={() => onMarkAsRead(notification.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-medium ${
                      !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {notification.message}
                    </h4>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <strong>Producto:</strong> {notification.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      <strong>Lote:</strong> {notification.batchNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      <strong>Ubicación:</strong> {notification.currentLocation}
                    </p>
                    <p className="text-xs text-gray-400">
                      <SafeDate date={notification.timestamp} format="full" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {stats.critical > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h4 className="font-medium text-red-900">Acción Requerida</h4>
          </div>
          <p className="text-sm text-red-700 mb-3">
            Tienes {stats.critical} producto(s) con problemas críticos de caducidad. 
            Se recomienda tomar acción inmediata.
          </p>
          <div className="flex space-x-2">
            <button className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
              Ver Productos Críticos
            </button>
            <button className="text-xs bg-white text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-50 transition-colors">
              Generar Reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
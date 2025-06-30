import { useState, useEffect, useMemo } from 'react';
import { Product, ProductStatus } from '@/types';

export interface Notification {
  id: string;
  productId: string;
  productName: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  daysToExpire: number;
  timestamp: string;
  isRead: boolean;
  batchNumber: string;
  currentLocation: string;
}

export interface NotificationStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unread: number;
}

export const useNotifications = (products: Product[] = []) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());

  // Calcular notificaciones basadas en productos
  const generatedNotifications = useMemo(() => {
    const now = new Date();
    const newNotifications: Notification[] = [];

    products.forEach(product => {
      // Solo generar notificaciones para productos activos
      if (product.status !== ProductStatus.ACTIVE) return;

      const expirationDate = new Date(product.expirationDate);
      const timeDiff = expirationDate.getTime() - now.getTime();
      const daysToExpire = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      let notification: Notification | null = null;

      // Productos ya vencidos (crítico)
      if (daysToExpire < 0) {
        notification = {
          id: `${product.id}-expired`,
          productId: product.id,
          productName: product.name,
          message: `¡CRÍTICO! ${product.name} venció hace ${Math.abs(daysToExpire)} día(s)`,
          type: 'critical',
          daysToExpire,
          timestamp: new Date().toISOString(),
          isRead: false,
          batchNumber: product.batchNumber,
          currentLocation: product.currentLocation
        };
      }
      // Productos que vencen hoy (crítico)
      else if (daysToExpire === 0) {
        notification = {
          id: `${product.id}-today`,
          productId: product.id,
          productName: product.name,
          message: `¡CRÍTICO! ${product.name} vence HOY`,
          type: 'critical',
          daysToExpire,
          timestamp: new Date().toISOString(),
          isRead: false,
          batchNumber: product.batchNumber,
          currentLocation: product.currentLocation
        };
      }
      // Productos que vencen en 1-3 días (warning)
      else if (daysToExpire >= 1 && daysToExpire <= 3) {
        notification = {
          id: `${product.id}-soon`,
          productId: product.id,
          productName: product.name,
          message: `${product.name} vence en ${daysToExpire} día(s)`,
          type: 'warning',
          daysToExpire,
          timestamp: new Date().toISOString(),
          isRead: false,
          batchNumber: product.batchNumber,
          currentLocation: product.currentLocation
        };
      }
      // Productos que vencen en 4-7 días (info)
      else if (daysToExpire >= 4 && daysToExpire <= 7) {
        notification = {
          id: `${product.id}-upcoming`,
          productId: product.id,
          productName: product.name,
          message: `${product.name} vence en ${daysToExpire} días`,
          type: 'info',
          daysToExpire,
          timestamp: new Date().toISOString(),
          isRead: false,
          batchNumber: product.batchNumber,
          currentLocation: product.currentLocation
        };
      }

      if (notification) {
        newNotifications.push(notification);
      }
    });

    return newNotifications;
  }, [products]);

  // Actualizar notificaciones cuando cambien los productos
  useEffect(() => {
    // Mantener el estado de leído de notificaciones existentes
    const updatedNotifications = generatedNotifications.map(newNotification => {
      const existingNotification = notifications.find(n => n.id === newNotification.id);
      return {
        ...newNotification,
        isRead: existingNotification?.isRead || false
      };
    });

    setNotifications(updatedNotifications);
  }, [generatedNotifications]);

  // Estadísticas de notificaciones
  const stats: NotificationStats = useMemo(() => {
    const total = notifications.length;
    const critical = notifications.filter(n => n.type === 'critical').length;
    const warning = notifications.filter(n => n.type === 'warning').length;
    const info = notifications.filter(n => n.type === 'info').length;
    const unread = notifications.filter(n => !n.isRead).length;

    return { total, critical, warning, info, unread };
  }, [notifications]);

  // Marcar notificación como leída
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Marcar todas como leídas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  // Filtrar notificaciones por tipo
  const getNotificationsByType = (type: 'critical' | 'warning' | 'info') => {
    return notifications.filter(n => n.type === type);
  };

  // Obtener notificaciones no leídas
  const getUnreadNotifications = () => {
    return notifications.filter(n => !n.isRead);
  };

  // Obtener notificaciones más críticas (para mostrar primero)
  const getCriticalNotifications = () => {
    return notifications
      .filter(n => n.type === 'critical')
      .sort((a, b) => a.daysToExpire - b.daysToExpire); // Los más vencidos primero
  };

  // Verificar si hay productos que requieren atención inmediata
  const hasUrgentNotifications = () => {
    return notifications.some(n => n.type === 'critical' && !n.isRead);
  };

  return {
    notifications,
    stats,
    lastCheck,
    markAsRead,
    markAllAsRead,
    getNotificationsByType,
    getUnreadNotifications,
    getCriticalNotifications,
    hasUrgentNotifications
  };
};

export default useNotifications;
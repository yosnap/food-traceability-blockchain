import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Notification, NotificationStats, Product } from '../types';
import { apiService } from '../services/api';
import { generateMockNotifications, calculateNotificationStats } from '../utils/notificationUtils';

// Notification handler disabled for Expo Go compatibility
// Notifications.setNotificationHandler({...});

interface NotificationContextType {
  notifications: Notification[];
  stats: NotificationStats;
  expoPushToken: string | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  scheduleExpirationNotification: (product: Product) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Registrar para notificaciones push
  // Push notifications disabled for Expo Go compatibility
  async function registerForPushNotificationsAsync(): Promise<string | null> {
    console.log('Push notifications disabled in demo mode');
    return 'demo-token';
  }

  // Solicitar permisos de notificación (demo mode)
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const token = await registerForPushNotificationsAsync();
      setExpoPushToken(token);
      return true; // Always return true in demo mode
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  // Marcar notificación como leída
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  // Programar notificación de caducidad (demo mode)
  const scheduleExpirationNotification = async (product: Product) => {
    try {
      console.log(`Demo: Notificación programada para ${product.name}`);
      // Notification scheduling disabled for Expo Go compatibility
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  // Refrescar notificaciones desde el servidor
  const refreshNotifications = async () => {
    try {
      // En un entorno real, esto vendría del servidor
      // Por ahora usamos datos mock
      const response = await apiService.getExpiringProducts(7);
      
      if (response.success && response.data) {
        const mockNotifications = generateMockNotifications(response.data);
        setNotifications(mockNotifications);
      } else {
        // Fallback a datos mock si no hay conexión
        const mockProducts: Product[] = []; // Array vacío para demo
        const mockNotifications = generateMockNotifications(mockProducts);
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      // Fallback a datos mock
      const mockNotifications = generateMockNotifications([]);
      setNotifications(mockNotifications);
    }
  };

  // Calcular estadísticas cuando cambian las notificaciones
  useEffect(() => {
    const newStats = calculateNotificationStats(notifications);
    setStats(newStats);
  }, [notifications]);

  // Inicializar notificaciones al montar el componente
  useEffect(() => {
    requestPermissions();
    refreshNotifications();

    // Demo mode - notification listeners disabled
    console.log('Demo mode: Notification listeners disabled');
    
    // Actualizar notificaciones cada 5 minutos
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    stats,
    expoPushToken,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    requestPermissions,
    scheduleExpirationNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
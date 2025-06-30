import { Product, Notification, NotificationStats } from '../types';

// Generar notificaciones mock basadas en productos
export function generateMockNotifications(products: Product[]): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  // Datos mock para demo
  const mockProducts = [
    {
      id: 'prod-001',
      name: 'Tomates Cherry Orgánicos',
      batchNumber: 'TCO-2025-001',
      expirationDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Vencido ayer
      currentLocation: 'Almacén Central',
    },
    {
      id: 'prod-002',
      name: 'Leche Pasteurizada Premium',
      batchNumber: 'LPP-2025-002',
      expirationDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Vence mañana
      currentLocation: 'Refrigerador A-1',
    },
    {
      id: 'prod-003',
      name: 'Pan Integral Artesanal',
      batchNumber: 'PIA-2025-003',
      expirationDate: now.toISOString(), // Vence hoy
      currentLocation: 'Panadería Local',
    },
    {
      id: 'prod-004',
      name: 'Yogurt Natural Sin Azúcar',
      batchNumber: 'YNS-2025-004',
      expirationDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Vence en 3 días
      currentLocation: 'Sección Lácteos',
    },
    {
      id: 'prod-005',
      name: 'Manzanas Red Delicious',
      batchNumber: 'MRD-2025-005',
      expirationDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Vence en 5 días
      currentLocation: 'Sección Frutas',
    },
  ];

  const productsToProcess = products.length > 0 ? products : mockProducts;

  productsToProcess.forEach((product, index) => {
    const expirationDate = new Date(product.expirationDate);
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysToExpire = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    let type: 'critical' | 'warning' | 'info';
    let title: string;
    let message: string;

    if (daysToExpire < 0) {
      type = 'critical';
      title = '🚨 Producto Vencido';
      message = `${product.name} venció hace ${Math.abs(daysToExpire)} día(s)`;
    } else if (daysToExpire === 0) {
      type = 'critical';
      title = '⚠️ Producto Vence Hoy';
      message = `${product.name} vence hoy`;
    } else if (daysToExpire <= 1) {
      type = 'critical';
      title = '🔴 Vencimiento Crítico';
      message = `${product.name} vence en ${daysToExpire} día`;
    } else if (daysToExpire <= 3) {
      type = 'warning';
      title = '🟠 Vencimiento Próximo';
      message = `${product.name} vence en ${daysToExpire} días`;
    } else if (daysToExpire <= 7) {
      type = 'info';
      title = '🔵 Monitoreo de Caducidad';
      message = `${product.name} vence en ${daysToExpire} días`;
    } else {
      // No crear notificación para productos que vencen en más de 7 días
      return;
    }

    notifications.push({
      id: `notif-${product.id}-${index}`,
      type,
      title,
      message,
      productId: product.id,
      productName: product.name,
      batchNumber: product.batchNumber || `BATCH-${product.id}`,
      expirationDate: product.expirationDate,
      daysToExpire,
      isRead: Math.random() > 0.7, // 30% probabilidad de estar leída
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      currentLocation: product.currentLocation || 'Ubicación no especificada',
    });
  });

  // Ordenar por criticidad y días para vencer
  return notifications.sort((a, b) => {
    const typeOrder = { critical: 0, warning: 1, info: 2 };
    if (a.type !== b.type) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.daysToExpire - b.daysToExpire;
  });
}

// Calcular estadísticas de notificaciones
export function calculateNotificationStats(notifications: Notification[]): NotificationStats {
  const stats: NotificationStats = {
    total: notifications.length,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
  };

  notifications.forEach(notification => {
    if (!notification.isRead) {
      stats.unread++;
    }

    switch (notification.type) {
      case 'critical':
        stats.critical++;
        break;
      case 'warning':
        stats.warning++;
        break;
      case 'info':
        stats.info++;
        break;
    }
  });

  return stats;
}

// Obtener color para el tipo de notificación
export function getNotificationColor(type: 'critical' | 'warning' | 'info'): string {
  switch (type) {
    case 'critical':
      return '#ef4444'; // red-500
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'info':
      return '#3b82f6'; // blue-500
    default:
      return '#6b7280'; // gray-500
  }
}

// Obtener icono para el tipo de notificación
export function getNotificationIcon(type: 'critical' | 'warning' | 'info'): string {
  switch (type) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'notifications';
  }
}

// Formatear días para vencimiento
export function formatDaysToExpire(days: number): string {
  if (days < 0) {
    return `Vencido hace ${Math.abs(days)} día(s)`;
  } else if (days === 0) {
    return 'Vence hoy';
  } else if (days === 1) {
    return 'Vence mañana';
  } else {
    return `Vence en ${days} días`;
  }
}

// Determinar si una notificación es urgente
export function isUrgentNotification(notification: Notification): boolean {
  return notification.type === 'critical' || 
         (notification.type === 'warning' && notification.daysToExpire <= 1);
}
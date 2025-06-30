import { Product, ProductStatus } from '@/types';

export interface ExpirationInfo {
  daysToExpire: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  urgencyLevel: 'critical' | 'warning' | 'info' | 'normal';
  urgencyMessage: string;
  urgencyColor: string;
  canTransfer: boolean;
}

/**
 * Calcula información de caducidad para un producto
 */
export const calculateExpirationInfo = (product: Product): ExpirationInfo => {
  const now = new Date();
  const expirationDate = new Date(product.expirationDate);
  const timeDiff = expirationDate.getTime() - now.getTime();
  const daysToExpire = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const isExpired = daysToExpire < 0;
  const isExpiringSoon = daysToExpire >= 0 && daysToExpire <= 7;

  let urgencyLevel: 'critical' | 'warning' | 'info' | 'normal' = 'normal';
  let urgencyMessage = '';
  let urgencyColor = '';
  let canTransfer = true;

  if (isExpired) {
    urgencyLevel = 'critical';
    urgencyMessage = `Vencido hace ${Math.abs(daysToExpire)} día(s)`;
    urgencyColor = 'bg-red-100 text-red-800 border-red-200';
    canTransfer = false;
  } else if (daysToExpire === 0) {
    urgencyLevel = 'critical';
    urgencyMessage = 'Vence HOY';
    urgencyColor = 'bg-red-100 text-red-800 border-red-200';
    canTransfer = false;
  } else if (daysToExpire >= 1 && daysToExpire <= 3) {
    urgencyLevel = 'warning';
    urgencyMessage = `Vence en ${daysToExpire} día(s)`;
    urgencyColor = 'bg-orange-100 text-orange-800 border-orange-200';
    canTransfer = true;
  } else if (daysToExpire >= 4 && daysToExpire <= 7) {
    urgencyLevel = 'info';
    urgencyMessage = `Vence en ${daysToExpire} días`;
    urgencyColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    canTransfer = true;
  } else {
    urgencyLevel = 'normal';
    urgencyMessage = `Vence en ${daysToExpire} días`;
    urgencyColor = 'bg-green-100 text-green-800 border-green-200';
    canTransfer = true;
  }

  return {
    daysToExpire,
    isExpired,
    isExpiringSoon,
    urgencyLevel,
    urgencyMessage,
    urgencyColor,
    canTransfer
  };
};

/**
 * Filtra productos por nivel de urgencia
 */
export const filterProductsByUrgency = (
  products: Product[], 
  urgencyLevel: 'critical' | 'warning' | 'info' | 'normal'
): Product[] => {
  return products.filter(product => {
    const expInfo = calculateExpirationInfo(product);
    return expInfo.urgencyLevel === urgencyLevel;
  });
};

/**
 * Obtiene productos críticos (vencidos o que vencen hoy)
 */
export const getCriticalProducts = (products: Product[]): Product[] => {
  return filterProductsByUrgency(products, 'critical');
};

/**
 * Obtiene productos con advertencias (vencen en 1-3 días)
 */
export const getWarningProducts = (products: Product[]): Product[] => {
  return filterProductsByUrgency(products, 'warning');
};

/**
 * Obtiene productos informativos (vencen en 4-7 días)
 */
export const getInfoProducts = (products: Product[]): Product[] => {
  return filterProductsByUrgency(products, 'info');
};

/**
 * Cuenta productos por urgencia
 */
export const countProductsByUrgency = (products: Product[]) => {
  const critical = getCriticalProducts(products).length;
  const warning = getWarningProducts(products).length;
  const info = getInfoProducts(products).length;
  const normal = filterProductsByUrgency(products, 'normal').length;

  return { critical, warning, info, normal, total: products.length };
};

/**
 * Ordena productos por urgencia (más críticos primero)
 */
export const sortProductsByUrgency = (products: Product[]): Product[] => {
  return [...products].sort((a, b) => {
    const expInfoA = calculateExpirationInfo(a);
    const expInfoB = calculateExpirationInfo(b);

    // Orden por urgencia: critical > warning > info > normal
    const urgencyOrder = { critical: 0, warning: 1, info: 2, normal: 3 };
    
    if (expInfoA.urgencyLevel !== expInfoB.urgencyLevel) {
      return urgencyOrder[expInfoA.urgencyLevel] - urgencyOrder[expInfoB.urgencyLevel];
    }

    // Si tienen la misma urgencia, ordenar por días hasta vencer (menos días primero)
    return expInfoA.daysToExpire - expInfoB.daysToExpire;
  });
};

/**
 * Genera fechas de vencimiento variadas para testing
 */
export const generateTestExpirationDates = () => {
  const today = new Date();
  
  return {
    expired: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 2 días
    today: today.toISOString().split('T')[0], // Hoy
    tomorrow: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
    threeDays: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 días
    oneWeek: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 semana
    oneMonth: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 mes
  };
};
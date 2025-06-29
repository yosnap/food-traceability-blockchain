import { format, formatDistanceToNow, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { FoodStatus, FoodCategory, UserRole } from '@/types';

// Date utilities
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return 'Fecha inválida';
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return 'Fecha inválida';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return 'Fecha inválida';
  }
};

export const getDaysUntilExpiration = (expirationDate: string): number => {
  try {
    const expDate = parseISO(expirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return 0;
  }
};

export const isProductExpiring = (expirationDate: string, daysThreshold: number = 2): boolean => {
  const daysUntil = getDaysUntilExpiration(expirationDate);
  return daysUntil <= daysThreshold && daysUntil > 0;
};

export const isProductExpired = (expirationDate: string): boolean => {
  const daysUntil = getDaysUntilExpiration(expirationDate);
  return daysUntil <= 0;
};

// Status utilities
export const getProductStatus = (expirationDate: string): FoodStatus => {
  if (isProductExpired(expirationDate)) {
    return FoodStatus.EXPIRED;
  }
  if (isProductExpiring(expirationDate)) {
    return FoodStatus.EXPIRING;
  }
  return FoodStatus.FRESH;
};

export const getStatusColor = (status: FoodStatus): string => {
  const colors: Record<FoodStatus, string> = {
    [FoodStatus.FRESH]: 'green',
    [FoodStatus.EXPIRING]: 'orange',
    [FoodStatus.EXPIRED]: 'red',
    [FoodStatus.CONSUMED]: 'gray',
    [FoodStatus.TRANSFERRED]: 'blue',
  };
  return colors[status] || 'gray';
};

export const getStatusLabel = (status: FoodStatus): string => {
  const labels: Record<FoodStatus, string> = {
    [FoodStatus.FRESH]: 'Fresco',
    [FoodStatus.EXPIRING]: 'Próximo a caducar',
    [FoodStatus.EXPIRED]: 'Caducado',
    [FoodStatus.CONSUMED]: 'Consumido',
    [FoodStatus.TRANSFERRED]: 'Transferido',
  };
  return labels[status] || 'Desconocido';
};

// Category utilities
export const getCategoryLabel = (category: FoodCategory): string => {
  const labels: Record<FoodCategory, string> = {
    [FoodCategory.VEGETABLES]: 'Verduras',
    [FoodCategory.FRUITS]: 'Frutas',
    [FoodCategory.MEAT]: 'Carnes',
    [FoodCategory.DAIRY]: 'Lácteos',
    [FoodCategory.GRAINS]: 'Cereales',
    [FoodCategory.SEAFOOD]: 'Mariscos',
    [FoodCategory.BEVERAGES]: 'Bebidas',
    [FoodCategory.PROCESSED]: 'Procesados',
  };
  return labels[category] || 'Otros';
};

export const getCategoryIcon = (category: FoodCategory): string => {
  const icons: Record<FoodCategory, string> = {
    [FoodCategory.VEGETABLES]: '🥬',
    [FoodCategory.FRUITS]: '🍎',
    [FoodCategory.MEAT]: '🥩',
    [FoodCategory.DAIRY]: '🥛',
    [FoodCategory.GRAINS]: '🌾',
    [FoodCategory.SEAFOOD]: '🐟',
    [FoodCategory.BEVERAGES]: '🥤',
    [FoodCategory.PROCESSED]: '🥫',
  };
  return icons[category] || '📦';
};

// Role utilities
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    [UserRole.PRODUCER]: 'Productor',
    [UserRole.PROCESSOR]: 'Procesador',
    [UserRole.DISTRIBUTOR]: 'Distribuidor',
    [UserRole.RETAILER]: 'Minorista',
    [UserRole.CONSUMER]: 'Consumidor',
    [UserRole.ADMIN]: 'Administrador',
  };
  return labels[role] || 'Usuario';
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    [UserRole.PRODUCER]: 'green',
    [UserRole.PROCESSOR]: 'blue',
    [UserRole.DISTRIBUTOR]: 'purple',
    [UserRole.RETAILER]: 'orange',
    [UserRole.CONSUMER]: 'gray',
    [UserRole.ADMIN]: 'red',
  };
  return colors[role] || 'gray';
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 9;
};

export const isValidAddress = (address: string): boolean => {
  return address.startsWith('0x') && address.length === 42;
};

// Formatting utilities
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-ES').format(number);
};

export const formatWeight = (weight: number): string => {
  if (weight < 1) {
    return `${Math.round(weight * 1000)}g`;
  }
  return `${weight}kg`;
};

export const formatVolume = (volume: number): string => {
  if (volume < 1) {
    return `${Math.round(volume * 1000)}ml`;
  }
  return `${volume}L`;
};

// Truncate utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const truncateAddress = (address: string): string => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = item[key] as string;
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Local Storage utilities
export const setLocalStorage = (key: string, value: any): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    }
  } catch (error) {
    console.error('Error getting localStorage:', error);
  }
  return defaultValue;
};

export const removeLocalStorage = (key: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error removing localStorage:', error);
  }
};

// URL utilities
export const generateQRCodeUrl = (text: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
};

export const generateProductUrl = (productId: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/product/${productId}`;
  }
  return `/product/${productId}`;
};

// Search utilities
export const searchInText = (text: string, query: string): boolean => {
  return text.toLowerCase().includes(query.toLowerCase());
};

export const highlightSearchTerm = (text: string, query: string): string => {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// Color utilities
export const generateAvatarColor = (text: string): string => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
  ];
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
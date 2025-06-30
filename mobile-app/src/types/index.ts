export interface Product {
  id: string;
  name: string;
  batchNumber: string;
  productionDate: string;
  expirationDate: string;
  status: ProductStatus;
  currentLocation: string;
  temperature: number;
  humidity: number;
  producer: Producer;
  metadata: ProductMetadata;
  ownershipHistory?: Transfer[];
}

export interface Producer {
  id: string;
  name: string;
  location: string;
}

export interface ProductMetadata {
  variety: string;
  weight: string;
  certification: string;
  harvestDate: string;
  transferHistory?: Transfer[];
}

export interface Transfer {
  timestamp: string;
  fromRole: UserRole;
  toRole: UserRole;
  recipient: string;
  location: string;
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  IN_TRANSIT = 'IN_TRANSIT',
  EXPIRED = 'EXPIRED',
  RECALLED = 'RECALLED',
  CONSUMED = 'CONSUMED'
}

export enum UserRole {
  PRODUCER = 'PRODUCER',
  PROCESSOR = 'PROCESSOR',
  DISTRIBUTOR = 'DISTRIBUTOR',
  RETAILER = 'RETAILER',
  CONSUMER = 'CONSUMER',
  ADMIN = 'ADMIN'
}

export interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expirationDate: string;
  daysToExpire: number;
  isRead: boolean;
  timestamp: string;
  currentLocation: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  info: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location: string;
  avatar?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ProductHistory {
  productId: string;
  events: HistoryEvent[];
}

export interface HistoryEvent {
  timestamp: string;
  type: 'created' | 'transferred' | 'location_updated' | 'status_changed';
  description: string;
  location: string;
  actor: string;
  metadata?: Record<string, any>;
}
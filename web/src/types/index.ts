// Types for Food Traceability Frontend

export enum UserRole {
  PRODUCER = 'producer',
  FACTORY = 'factory',
  PROCESSOR = 'processor',
  DISTRIBUTOR = 'distributor',
  RETAILER = 'retailer',
  CONSUMER = 'consumer',
  ADMIN = 'admin'
}

export enum FoodCategory {
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  MEAT = 'MEAT',
  DAIRY = 'DAIRY',
  GRAINS = 'GRAINS',
  SEAFOOD = 'SEAFOOD',
  BEVERAGES = 'BEVERAGES',
  PROCESSED = 'PROCESSED'
}

export enum FoodStatus {
  FRESH = 'FRESH',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
  TRANSFERRED = 'TRANSFERRED'
}

export enum TransferType {
  SALE = 'SALE',
  DISTRIBUTION = 'DISTRIBUTION',
  PROCESSING = 'PROCESSING',
  CONSUMPTION = 'CONSUMPTION'
}

export interface Location {
  address: string;
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface OriginInfo {
  farm: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  certifications?: string[];
}

export interface StorageConditions {
  temperature: string;
  humidity?: string;
  requirements?: string[];
}

export interface Transfer {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  transferType: TransferType;
  location: Location;
  quantity?: number;
  price?: number;
  conditions?: string;
  notes?: string;
}

export interface FoodAsset {
  id: string;
  batchNumber: string;
  name: string;
  category: FoodCategory;
  description?: string;
  quantity: number;
  productionDate: string;
  expirationDate: string;
  currentOwner: string;
  currentOwnerRole: UserRole;
  status: FoodStatus;
  ownershipHistory: Transfer[];
  origin: OriginInfo;
  allergens: string[];
  storageConditions: StorageConditions;
  weight?: number;
  volume?: number;
  brand?: string;
  nutritionalInfo?: Record<string, any>;
  qualityScore?: number;
  certifications?: string[];
  images?: string[];
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  consumedDate?: string;
  consumedBy?: string;
  rating?: number;
  consumerNotes?: string;
}

export interface User {
  address: string;           // Ethereum address
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  location: Location;
  licenseNumber?: string;
  isActive: boolean;
  isVerified: boolean;
  profileImage?: string;
  notificationSettings?: NotificationSettings;
  createdAt: string;
  updatedAt: string;
  // X.509 Certificate information (siguiendo repositorio de referencia)
  fabricUserId?: string;     // ID del usuario en Fabric (ej: User1@org1.example.com)
  mspId?: string;           // MSP ID (ej: Org1MSP)
  certificateId?: string;   // ID único del certificado
  organizationName?: string; // Nombre de la organización (ej: org1)
}

// Interfaces para autenticación con ethers.js (siguiendo repositorio de referencia)
export interface EthersWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export interface SignatureRequest {
  message: string;
  address: string;
  signature?: string;
}

// Interface para respuesta de login con X.509
export interface X509LoginResponse {
  token: string;
  user: User;
  certificateInfo: {
    fabricUserId: string;
    mspId: string;
    certificateId: string;
    organizationName: string;
  };
}

export interface NotificationSettings {
  enableNotifications: boolean;
  notificationDays: number;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  quietHours?: {
    start: string;
    end: string;
  };
  categorySettings?: Record<FoodCategory, {
    enabled: boolean;
    daysAhead: number;
  }>;
}

export interface UserStats {
  totalProducts: number;
  activeProducts: number;
  expiringProducts: number;
  expiredProducts: number;
  transfersCompleted: number;
  totalValue?: number;
  categories: Record<FoodCategory, number>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface CreateProductForm {
  name: string;
  category: FoodCategory;
  description?: string;
  quantity: number;
  productionDate: string;
  expirationDate: string;
  batchNumber?: string;
  origin: {
    farm: string;
    location: string;
  };
  storageConditions: {
    temperature: string;
    humidity?: string;
    requirements?: string[];
  };
  allergens: string[];
  weight?: number;
  volume?: number;
  brand?: string;
}

export interface TransferProductForm {
  newOwner: string;
  transferType: TransferType;
  location: Location;
  quantity: number;
  price?: number;
  conditions?: string;
  notes?: string;
}

export interface ConsumeProductForm {
  consumedDate: string;
  rating: number;
  notes?: string;
}

export interface RegisterUserForm {
  address: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  location: Location;
  licenseNumber?: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalProducts: number;
  expiringProducts: number;
  recentTransfers: number;
  totalValue?: number;
}

export interface ProductFilters {
  category?: FoodCategory;
  status?: FoodStatus;
  search?: string;
  sortBy?: 'name' | 'expirationDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  productId?: string;
  actionUrl?: string;
}

// Route Protection
export interface RouteGuard {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

// Configuration
export interface AppConfig {
  apiBaseUrl: string;
  appName: string;
  version: string;
  features: {
    enableNotifications: boolean;
    enableQRCodes: boolean;
    enableCharts: boolean;
    enableMaps: boolean;
  };
}

// Additional types for producer dashboard
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  IN_TRANSIT = 'IN_TRANSIT',
  EXPIRED = 'EXPIRED',
  RECALLED = 'RECALLED',
  CONSUMED = 'CONSUMED'
}

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
  producer: {
    id: string;
    name: string;
    location: string;
  };
  metadata: {
    variety?: string;
    weight: string;
    certification?: string;
    harvestDate?: string;
  };
}

// MetaMask Types
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener?: (eventName: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export interface MetaMaskProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
}

export interface WalletConnection {
  address: string;
  isConnected: boolean;
  provider: 'metamask' | 'predefined';
  chainId?: string;
}

export interface MetaMaskError {
  code: number;
  message: string;
  data?: any;
}
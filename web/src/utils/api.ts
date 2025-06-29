import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import { 
  ApiResponse, 
  FoodAsset, 
  User, 
  CreateProductForm, 
  TransferProductForm, 
  ConsumeProductForm,
  RegisterUserForm,
  NotificationSettings,
  UserStats,
  UserRole,
  FoodCategory
} from '@/types';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock token storage (in real app, use secure storage)
let authToken: string | null = null;

// Set auth token
export const setAuthToken = (token: string) => {
  authToken = token;
};

// Get auth token based on role
export const getAuthTokenByRole = (role: UserRole): string => {
  const roleTokenMap: Record<UserRole, string> = {
    [UserRole.PRODUCER]: 'producer-token',
    [UserRole.PROCESSOR]: 'processor-token',
    [UserRole.DISTRIBUTOR]: 'distributor-token',
    [UserRole.RETAILER]: 'retailer-token',
    [UserRole.CONSUMER]: 'consumer-token',
    [UserRole.ADMIN]: 'admin-token',
  };
  return roleTokenMap[role];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = authToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      toast.error('No autorizado. Por favor, inicia sesión.');
      // In real app, redirect to login
    } else if (error.response?.status === 403) {
      toast.error('No tienes permisos para realizar esta acción.');
    } else if (error.response?.status >= 500) {
      toast.error('Error del servidor. Inténtalo más tarde.');
    }
    return Promise.reject(error);
  }
);

// API functions

// Health and System
export const healthCheck = async (): Promise<ApiResponse> => {
  const response = await api.get('/api/health');
  return response.data;
};

export const getSystemInfo = async (): Promise<ApiResponse> => {
  const response = await api.get('/api/info');
  return response.data;
};

// User Management
export const registerUser = async (userData: RegisterUserForm): Promise<ApiResponse<User>> => {
  const response = await api.post('/api/users/register', userData);
  return response.data;
};

export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  const response = await api.get('/api/users/me');
  return response.data;
};

export const updateCurrentUser = async (userData: Partial<User>): Promise<ApiResponse<User>> => {
  const response = await api.put('/api/users/me', userData);
  return response.data;
};

export const getUserByAddress = async (address: string): Promise<ApiResponse<User>> => {
  const response = await api.get(`/api/users/${address}`);
  return response.data;
};

export const getNotificationSettings = async (): Promise<ApiResponse<NotificationSettings>> => {
  const response = await api.get('/api/users/me/notifications');
  return response.data;
};

export const updateNotificationSettings = async (
  settings: NotificationSettings
): Promise<ApiResponse<NotificationSettings>> => {
  const response = await api.put('/api/users/me/notifications', settings);
  return response.data;
};

export const getUserStats = async (): Promise<ApiResponse<UserStats>> => {
  const response = await api.get('/api/food/stats');
  return response.data;
};

// Food Products
export const pingChaincode = async (): Promise<ApiResponse> => {
  const response = await api.get('/api/food/ping');
  return response.data;
};

export const createProduct = async (productData: CreateProductForm): Promise<ApiResponse<FoodAsset>> => {
  // Generate unique product ID and batch number
  const productId = `PROD-${Date.now()}`;
  const batchNumber = productData.batchNumber || `BATCH-${new Date().getFullYear()}-${Date.now()}`;
  
  const fullProductData = {
    id: productId,
    batchNumber,
    ...productData,
  };
  
  const response = await api.post('/api/food/products', fullProductData);
  return response.data;
};

export const getProductById = async (id: string): Promise<ApiResponse<FoodAsset>> => {
  const response = await api.get(`/api/food/products/${id}`);
  return response.data;
};

export const getMyProducts = async (): Promise<ApiResponse<FoodAsset[]>> => {
  const response = await api.get('/api/food/products');
  return response.data;
};

export const getProductsByCategory = async (category: FoodCategory): Promise<ApiResponse<FoodAsset[]>> => {
  const response = await api.get(`/api/food/products/category/${category}`);
  return response.data;
};

export const getExpiringProducts = async (daysAhead?: number): Promise<ApiResponse<FoodAsset[]>> => {
  const params = daysAhead ? { daysAhead } : {};
  const response = await api.get('/api/food/expiring', { params });
  return response.data;
};

export const getExpiringProductsByCategory = async (
  category: FoodCategory,
  daysAhead?: number
): Promise<ApiResponse<FoodAsset[]>> => {
  const params = { category, ...(daysAhead && { daysAhead }) };
  const response = await api.get('/api/food/expiring', { params });
  return response.data;
};

export const transferProduct = async (
  productId: string,
  transferData: TransferProductForm
): Promise<ApiResponse<FoodAsset>> => {
  const response = await api.post(`/api/food/products/${productId}/transfer`, transferData);
  return response.data;
};

export const consumeProduct = async (
  productId: string,
  consumeData: ConsumeProductForm
): Promise<ApiResponse<FoodAsset>> => {
  const response = await api.post(`/api/food/products/${productId}/consume`, consumeData);
  return response.data;
};

// Utility functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'Ha ocurrido un error inesperado';
};

export const isApiSuccess = (response: ApiResponse): boolean => {
  return response.success === true;
};

// Mock authentication functions (replace with real auth in production)
export const mockLogin = (role: UserRole): Promise<{ token: string; user: User }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const token = getAuthTokenByRole(role);
      setAuthToken(token);
      
      const mockUser: User = {
        address: `0x${Date.now().toString(16)}`,
        name: `Usuario ${role}`,
        role,
        email: `${role.toLowerCase()}@example.com`,
        phone: '+34123456789',
        location: {
          address: 'Calle Ejemplo 123',
          city: 'Madrid',
          country: 'España',
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      resolve({ token, user: mockUser });
    }, 1000);
  });
};

export const mockLogout = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      authToken = null;
      resolve();
    }, 500);
  });
};

export default api;
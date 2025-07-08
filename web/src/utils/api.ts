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
    // Intentar obtener token del localStorage si no está en memoria
    let token = authToken;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('authToken');
    }
    
    console.log('🔍 Request interceptor:', {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      tokenLength: token ? token.length : 0,
      headers: config.headers
    });
    
    if (token && token.trim().length > 0) {
      // Asegurar formato Bearer correcto
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = authHeader;
      console.log('✅ Token agregado a headers:', authHeader.substring(0, 30) + '...');
    } else {
      console.log('❌ No hay token disponible para la solicitud. Token:', token);
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

// Real authentication function with X.509 certificates (siguiendo repositorio de referencia)
export const realLogin = async (role: UserRole): Promise<{ token: string; user: User }> => {
  try {
    console.log(`🔐 Iniciando autenticación X.509 para rol: ${role}`);
    
    // Importar dinámicamente el servicio de wallet
    const { walletService } = await import('@/services/walletService');
    
    // Cargar wallet para el rol específico (siguiendo patrón del repositorio de referencia)
    const wallet = walletService.loadWalletByRole(role);
    console.log(`🔑 Wallet cargado para ${role}: ${wallet.address}`);
    
    // Realizar login con el backend (no enviar userId, dejar que el backend use el default)
    const response = await api.post('/api/auth/login', { 
      role
      // No enviar userId - el backend usará User1 o Admin según el rol
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login fallido');
    }
    
    const { token, user } = response.data.data;
    
    // Agregar información del wallet al usuario
    const enrichedUser: User = {
      ...user,
      address: wallet.address, // Usar la dirección del wallet
      fabricUserId: user.fabricUserId,
      mspId: user.mspId,
      certificateId: user.certificateId,
      organizationName: user.organizationName
    };
    
    setAuthToken(token);
    
    console.log(`✅ Autenticación X.509 exitosa para ${role}`);
    console.log('🔍 Token guardado:', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...',
      authTokenInMemory: !!authToken,
      tokenInLocalStorage: !!localStorage.getItem('authToken')
    });
    return { token, user: enrichedUser };
    
  } catch (error: any) {
    console.error('❌ Error en autenticación X.509:', error);
    
    if (error.response?.status === 503) {
      throw new Error('Blockchain no disponible. Verifica que el chaincode esté funcionando.');
    } else if (error.response?.status === 401) {
      throw new Error('Credenciales X.509 inválidas.');
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  }
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

export const realLogout = async (): Promise<void> => {
  try {
    await api.post('/api/auth/logout');
  } catch (error) {
    console.warn('Error al notificar logout al servidor:', error);
  }
  
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('userRole');
  }
};

export const mockLogout = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      authToken = null;
      resolve();
    }, 500);
  });
};

// ==========================================
// HLF API FUNCTIONS (X.509 + ethers.js)
// ==========================================

/**
 * Ping al chaincode HLF con autenticación X.509
 */
export const pingHLF = async (): Promise<ApiResponse> => {
  const response = await api.get('/api/hlf/ping');
  return response.data;
};

/**
 * Crear usuario en el chaincode con firma ethers.js
 */
export const createUserHLF = async (
  address: string, 
  role: UserRole, 
  signature?: string
): Promise<ApiResponse> => {
  const response = await api.post('/api/hlf/users', {
    address,
    role,
    signature
  });
  return response.data;
};

/**
 * Obtener usuario del chaincode
 */
export const getUserHLF = async (address: string): Promise<ApiResponse> => {
  const response = await api.get(`/api/hlf/users/${address}`);
  return response.data;
};

/**
 * Crear token en el chaincode
 */
export const createTokenHLF = async (
  tokenId: string,
  name: string,
  amount: number,
  attributes: any = {},
  signature?: string
): Promise<ApiResponse> => {
  const response = await api.post('/api/hlf/tokens', {
    tokenId,
    name,
    amount,
    attributes,
    signature
  });
  return response.data;
};

/**
 * Transferir token con validación de roles
 */
export const transferTokenHLF = async (
  tokenId: string,
  to: string,
  amount: number,
  signature?: string
): Promise<ApiResponse> => {
  const response = await api.post('/api/hlf/tokens/transfer', {
    tokenId,
    to,
    amount,
    signature
  });
  return response.data;
};

/**
 * Crear un producto tokenizado con firma
 */
export const createProductWithSignature = async (
  productData: CreateProductForm,
  signature?: string
): Promise<ApiResponse<FoodAsset>> => {
  // Generar ID único para el token
  const tokenId = `PROD-${Date.now()}`;
  
  try {
    // Si tenemos firma, usar el endpoint HLF
    if (signature) {
      const tokenResponse = await createTokenHLF(
        tokenId,
        productData.name,
        productData.quantity,
        {
          category: productData.category,
          description: productData.description,
          productionDate: productData.productionDate,
          expirationDate: productData.expirationDate,
          batchNumber: productData.batchNumber
        },
        signature
      );
      
      // Convertir respuesta del token a formato FoodAsset
      const foodAsset: FoodAsset = {
        id: tokenId,
        batchNumber: productData.batchNumber || `BATCH-${Date.now()}`,
        name: productData.name,
        category: productData.category,
        description: productData.description,
        quantity: productData.quantity,
        productionDate: productData.productionDate,
        expirationDate: productData.expirationDate,
        currentOwner: tokenResponse.data.owner,
        currentOwnerRole: UserRole.PRODUCER,
        status: 'FRESH' as any,
        ownershipHistory: [],
        origin: productData.origin,
        allergens: productData.allergens || [],
        storageConditions: productData.storageConditions,
        weight: productData.weight,
        volume: productData.volume,
        brand: productData.brand,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: foodAsset,
        message: 'Producto tokenizado exitosamente',
        timestamp: new Date().toISOString()
      };
    } else {
      // Fallback al método tradicional
      return await createProduct(productData);
    }
  } catch (error: any) {
    console.error('Error creando producto con firma:', error);
    throw error;
  }
};

// Mode detection and smart routing
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const login = isDemoMode ? mockLogin : realLogin;
export const logout = isDemoMode ? mockLogout : realLogout;

// Export wallet service (dynamic import for client-side only)
export { WalletService } from '@/services/walletService';

// Create wallet service instance only on client side
let walletServiceInstance: any = null;

export const getWalletService = async () => {
  if (typeof window === 'undefined') {
    throw new Error('WalletService only available on client side');
  }
  
  if (!walletServiceInstance) {
    const { WalletService } = await import('@/services/walletService');
    walletServiceInstance = WalletService.getInstance();
  }
  
  return walletServiceInstance;
};

// For backward compatibility, but should use getWalletService() instead
export const walletService = {
  signCreateToken: async (...args: any[]) => {
    const service = await getWalletService();
    return service.signCreateToken(...args);
  }
};

export default api;
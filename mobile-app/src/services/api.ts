import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductHistory, APIResponse, User, UserRole } from '../types';

// Configuración de la API
const API_BASE_URL = 'http://192.168.1.67:3001'; // URL del backend (IP local para Expo Go)
const OFFLINE_MODE = true; // Activar modo offline para demo

class APIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para añadir token de autenticación
    this.api.interceptors.request.use(async (config) => {
      try {
        let token = await AsyncStorage.getItem('authToken');
        
        // En modo demo, crear un token automáticamente
        if (!token) {
          token = 'demo-token-mobile-app-user';
          await AsyncStorage.setItem('authToken', token);
          console.log('Demo token created for mobile app');
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Error getting auth token:', error);
      }
      return config;
    });

    // Interceptor para manejar respuestas
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check del API
  async healthCheck(): Promise<APIResponse<any>> {
    if (OFFLINE_MODE) {
      return {
        success: true,
        data: { status: 'Demo Mode - API simulada', timestamp: new Date().toISOString() },
      };
    }
    
    try {
      const response: AxiosResponse = await this.api.get('/api/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obtener producto por ID o código QR
  async getProduct(id: string): Promise<APIResponse<Product>> {
    if (OFFLINE_MODE) {
      // Mock data para demo
      const mockProducts: {[key: string]: Product} = {
        'PROD-001': {
          id: 'PROD-001',
          name: 'Tomates Cherry Orgánicos',
          category: 'Vegetales',
          origin: 'Finca La Esperanza, Boyacá',
          currentLocation: 'Procesadora FreshFood',
          expirationDate: '2024-12-28',
          batchNumber: 'TOM-2024-001',
          currentOwner: 'PROC-001',
          status: 'EXPIRED',
          description: 'Tomates cherry orgánicos cultivados sin pesticidas',
          nutritionalInfo: { calories: 18, vitamins: ['C', 'K'] },
          certifications: ['Orgánico', 'Fair Trade']
        },
        'RET-002': {
          id: 'RET-002', 
          name: 'Leche Premium UHT',
          category: 'Lácteos',
          origin: 'Hacienda Los Alpes',
          currentLocation: 'Supermercado MegaMart',
          expirationDate: '2024-12-31',
          batchNumber: 'LECHE-2024-045',
          currentOwner: 'RET-001',
          status: 'EXPIRING_SOON',
          description: 'Leche UHT premium de vacas alimentadas con pasto',
          nutritionalInfo: { calories: 64, proteins: '3.2g' },
          certifications: ['Pasteurizada']
        }
      };
      
      const product = mockProducts[id];
      if (product) {
        return { success: true, data: product };
      } else {
        return { success: false, error: 'Producto no encontrado en modo demo' };
      }
    }
    
    try {
      // Primero intentamos como ID directo
      let response: AxiosResponse;
      try {
        response = await this.api.get(`/api/food/${id}`);
      } catch {
        // Si falla, intentamos buscar por código QR/batch number
        response = await this.api.get(`/api/food/batch/${id}`);
      }

      return {
        success: true,
        data: response.data.product,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Producto no encontrado',
      };
    }
  }

  // Obtener productos próximos a caducar
  async getExpiringProducts(days: number = 7): Promise<APIResponse<Product[]>> {
    try {
      const response: AxiosResponse = await this.api.get(
        `/api/food/expiring?days=${days}`
      );
      return {
        success: true,
        data: response.data.products || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error obteniendo productos',
      };
    }
  }

  // Obtener historial de un producto
  async getProductHistory(productId: string): Promise<APIResponse<ProductHistory>> {
    try {
      const response: AxiosResponse = await this.api.get(
        `/api/food/${productId}/history`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error obteniendo historial',
      };
    }
  }

  // Buscar productos por término
  async searchProducts(searchTerm: string): Promise<APIResponse<Product[]>> {
    try {
      const response: AxiosResponse = await this.api.get(
        `/api/food/search?query=${encodeURIComponent(searchTerm)}`
      );
      return {
        success: true,
        data: response.data.products || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error en búsqueda',
      };
    }
  }

  // Obtener estadísticas del usuario
  async getUserStats(): Promise<APIResponse<any>> {
    if (OFFLINE_MODE) {
      return {
        success: true,
        data: {
          totalProducts: 125,
          activeProducts: 98,
          expiredProducts: 12,
          expiringIn7Days: 15,
          notificationStats: {
            total: 27,
            unread: 8,
            critical: 3,
            warning: 12,
            info: 12
          }
        }
      };
    }
    
    try {
      const response: AxiosResponse = await this.api.get('/api/users/stats');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error obteniendo estadísticas',
      };
    }
  }

  // Autenticación (mock para desarrollo)
  async authenticate(role: UserRole): Promise<APIResponse<{ user: User; token: string }>> {
    try {
      // Mock authentication - en producción esto sería real
      const mockUsers: Record<UserRole, User> = {
        [UserRole.PRODUCER]: {
          id: 'prod-001',
          name: 'Granja Valle Verde',
          email: 'productor@valleverde.com',
          role: UserRole.PRODUCER,
          location: 'Valle Central, Costa Rica',
        },
        [UserRole.PROCESSOR]: {
          id: 'proc-001',
          name: 'Procesadora Industrial',
          email: 'procesador@industrial.com',
          role: UserRole.PROCESSOR,
          location: 'San José, Costa Rica',
        },
        [UserRole.DISTRIBUTOR]: {
          id: 'dist-001',
          name: 'Logística Nacional',
          email: 'distribuidor@logistica.com',
          role: UserRole.DISTRIBUTOR,
          location: 'Cartago, Costa Rica',
        },
        [UserRole.RETAILER]: {
          id: 'ret-001',
          name: 'Supermercado Central',
          email: 'retail@super.com',
          role: UserRole.RETAILER,
          location: 'San José, Costa Rica',
        },
        [UserRole.CONSUMER]: {
          id: 'cons-001',
          name: 'Usuario Final',
          email: 'usuario@email.com',
          role: UserRole.CONSUMER,
          location: 'San José, Costa Rica',
        },
        [UserRole.ADMIN]: {
          id: 'admin-001',
          name: 'Administrador Sistema',
          email: 'admin@sistema.com',
          role: UserRole.ADMIN,
          location: 'Oficina Central',
        },
      };

      const user = mockUsers[role];
      const token = `mock-token-${role}-${Date.now()}`;

      // Guardar token en AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));

      return {
        success: true,
        data: { user, token },
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Error en autenticación',
      };
    }
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<APIResponse<User>> {
    try {
      const userStr = await AsyncStorage.getItem('currentUser');
      if (!userStr) {
        return {
          success: false,
          error: 'No hay usuario autenticado',
        };
      }

      const user: User = JSON.parse(userStr);
      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Error obteniendo usuario',
      };
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('currentUser');
    } catch (error) {
      console.warn('Error during logout:', error);
    }
  }
}

export const apiService = new APIService();
export default apiService;
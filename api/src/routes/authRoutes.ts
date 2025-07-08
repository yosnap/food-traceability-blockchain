/**
 * Rutas de autenticación para el sistema Food Traceability
 * Maneja login, logout y validación de tokens
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { fabricGatewayService } from '../services/FabricGatewayService.js';

const router = Router();

// Interfaz para el request de login
interface LoginRequest {
  role: string;
  userId?: string;
}

// Interfaz para el usuario autenticado
interface AuthUser {
  address: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/auth/login
 * Autentica usuario por rol y genera JWT token con información X.509
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, userId }: LoginRequest = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role es requerido'
      });
    }

    // Validar roles permitidos (actualizado según repositorio de referencia)
    const allowedRoles = ['producer', 'factory', 'processor', 'distributor', 'retailer', 'consumer', 'admin'];
    if (!allowedRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Role inválido. Roles permitidos: producer, factory, processor, distributor, retailer, consumer, admin'
      });
    }

    // Mapear rol a organización y usuario por defecto
    const getRoleMapping = (role: string) => {
      switch (role.toLowerCase()) {
        case 'producer':
        case 'admin':
          return { 
            orgName: 'org1', 
            mspId: 'Org1MSP', 
            defaultUser: role === 'admin' ? 'Admin' : 'User1' 
          };
        case 'factory':
        case 'processor':
        case 'distributor':
        case 'retailer':
          return { 
            orgName: 'org2', 
            mspId: 'Org2MSP', 
            defaultUser: 'User1' 
          };
        case 'consumer':
          return { 
            orgName: 'org2', 
            mspId: 'Org2MSP', 
            defaultUser: 'User1' 
          };
        default:
          return { 
            orgName: 'org1', 
            mspId: 'Org1MSP', 
            defaultUser: 'User1' 
          };
      }
    };

    const { orgName, mspId, defaultUser } = getRoleMapping(role);
    const finalUserId = userId || defaultUser;

    // Verificar conexión con blockchain usando autenticación X.509
    try {
      const { hlfService } = await import('../services/HLFService.js');
      const pingResult = await hlfService.ping(finalUserId, role);
      console.log('✅ Blockchain conectado con X.509 durante login:', pingResult);
    } catch (pingError) {
      console.warn('⚠️ Blockchain no disponible durante login:', pingError);
      return res.status(503).json({
        success: false,
        error: 'Blockchain no disponible o certificados X.509 inválidos',
        details: pingError instanceof Error ? pingError.message : 'Error desconocido'
      });
    }

    // Generar datos de usuario basados en el rol y certificado X.509
    const userAddress = '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A';
    const fabricUserId = `${finalUserId}@${orgName}.example.com`;
    const certificateId = `cert-${orgName}-${finalUserId}-${Date.now()}`;
    
    const user: AuthUser = {
      address: userAddress,
      name: `${finalUserId} (${role.charAt(0).toUpperCase() + role.slice(1)})`,
      role: role.toLowerCase(),
      email: `${finalUserId.toLowerCase()}@${orgName}.example.com`,
      phone: '+34123456789',
      location: {
        address: `Dirección ${orgName.toUpperCase()}`,
        city: 'Madrid',
        country: 'España',
        coordinates: { lat: 40.4168, lng: -3.7038 }
      },
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generar JWT token con información del certificado X.509
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: fabricUserId, // ID del usuario en Fabric
        role: role.toLowerCase(),
        address: userAddress, // Dirección Ethereum
        name: user.name,
        mspId: mspId, // MSP ID para autenticación X.509
        certificateId: certificateId, // ID único del certificado
        organizationName: orgName
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalida token del usuario (logout)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // En un sistema real, aquí se invalidaría el token en una lista negra
    res.json({
      success: true,
      message: 'Logout exitoso',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verifica si el token JWT es válido
 */
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      res.json({
        success: true,
        message: 'Token válido',
        data: {
          userId: decoded.userId,
          role: decoded.role,
          address: decoded.address,
          name: decoded.name
        },
        timestamp: new Date().toISOString()
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

  } catch (error: any) {
    console.error('❌ Error verificando token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
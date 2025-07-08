/**
 * Middleware de autenticación por roles para transacciones blockchain
 * Permite que cada usuario firme sus propias transacciones según su rol
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
    userId: string;
    role: string;
    address: string;
    name: string;
    organization: string;
    permissions: string[];
}

// Extender interface de Request para incluir usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

// Mapeo de roles a organizaciones de Fabric
const ROLE_TO_ORG_MAP: Record<string, string> = {
    'producer': 'org1',
    'admin': 'org1',
    'processor': 'org2',
    'distributor': 'org2', 
    'retailer': 'org2',
    'consumer': 'org2'
};

// Permisos por rol
const ROLE_PERMISSIONS: Record<string, string[]> = {
    'admin': ['*'], // Todos los permisos
    'producer': ['create_product', 'transfer_product', 'update_own_product'],
    'processor': ['receive_product', 'process_product', 'transfer_product'],
    'distributor': ['receive_product', 'transfer_product', 'track_product'],
    'retailer': ['receive_product', 'sell_product', 'track_product'],
    'consumer': ['purchase_product', 'consume_product', 'rate_product']
};

/**
 * Middleware principal de autenticación
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido',
                code: 'NO_TOKEN'
            });
        }

        // Verificar y decodificar JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
        
        // Crear objeto de usuario autenticado
        const user: AuthenticatedUser = {
            userId: decoded.userId || decoded.sub,
            role: decoded.role,
            address: decoded.address,
            name: decoded.name,
            organization: ROLE_TO_ORG_MAP[decoded.role] || 'org1',
            permissions: ROLE_PERMISSIONS[decoded.role] || []
        };

        // Validar que el rol sea válido
        if (!user.role || !ROLE_PERMISSIONS[user.role]) {
            return res.status(403).json({
                success: false,
                message: 'Rol de usuario inválido',
                code: 'INVALID_ROLE'
            });
        }

        // Adjuntar usuario a la request
        req.user = user;
        
        console.log(`🔐 Usuario autenticado: ${user.name} (${user.role}) - Org: ${user.organization}`);
        next();

    } catch (error: any) {
        console.error('❌ Error de autenticación:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno de autenticación',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Middleware para validar permisos específicos
 */
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                code: 'NOT_AUTHENTICATED'
            });
        }

        // Admin tiene todos los permisos
        if (user.permissions.includes('*')) {
            return next();
        }

        // Verificar permiso específico
        if (!user.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: `Permiso requerido: ${permission}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                required: permission,
                userRole: user.role,
                userPermissions: user.permissions
            });
        }

        next();
    };
};

/**
 * Middleware para validar roles específicos
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: `Rol no autorizado. Roles permitidos: ${allowedRoles.join(', ')}`,
                code: 'ROLE_NOT_ALLOWED',
                userRole: user.role,
                allowedRoles
            });
        }

        next();
    };
};

/**
 * Middleware para validar propietario del recurso
 */
export const requireOwnership = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const resourceOwnerId = req.params.userId || req.body.userId || req.body.address;
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado',
            code: 'NOT_AUTHENTICATED'
        });
    }

    // Admin puede acceder a cualquier recurso
    if (user.role === 'admin') {
        return next();
    }

    // Verificar que el usuario sea el propietario del recurso
    if (user.userId !== resourceOwnerId && user.address !== resourceOwnerId) {
        return res.status(403).json({
            success: false,
            message: 'Solo puedes acceder a tus propios recursos',
            code: 'NOT_OWNER'
        });
    }

    next();
};

/**
 * Utlidad para extraer token del header Authorization
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return null;
    }

    // Formato: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Utlidad para crear JWT token (para testing)
 */
export const createTestToken = (user: Partial<AuthenticatedUser>): string => {
    const payload = {
        userId: user.userId,
        role: user.role,
        address: user.address,
        name: user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'default-secret');
};

/**
 * Middleware para modo de desarrollo (omitir autenticación)
 */
export const devModeAuth = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        // Usuario por defecto para desarrollo
        req.user = {
            userId: 'dev-user',
            role: 'admin',
            address: 'dev-address',
            name: 'Usuario de Desarrollo',
            organization: 'org1',
            permissions: ['*']
        };
        
        console.log('🔧 Modo desarrollo: autenticación omitida');
        return next();
    }

    // En otros casos, usar autenticación normal
    return authenticateUser(req, res, next);
};

export default {
    authenticateUser,
    requirePermission,
    requireRole,
    requireOwnership,
    createTestToken,
    devModeAuth
};
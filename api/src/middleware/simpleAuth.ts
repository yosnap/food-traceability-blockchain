/**
 * Middleware de autenticación simplificado para desarrollo
 */

import { Request, Response, NextFunction } from 'express';

export interface SimpleUser {
    userId: string;
    role: string;
    address: string;
    name: string;
    organization: string;
    permissions: string[];
}

// Extender Request para incluir usuario autenticado
declare global {
    namespace Express {
        interface Request {
            user?: SimpleUser;
        }
    }
}

/**
 * Middleware para modo de desarrollo (omitir autenticación)
 */
export const devModeAuth = (req: Request, res: Response, next: NextFunction) => {
    // Simular autenticación en desarrollo
    const role = req.headers['x-user-role'] as string || 'producer';
    const userId = req.headers['x-user-id'] as string || 'User1@org1.example.com';
    
    req.user = {
        userId,
        role,
        address: '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A',
        name: `Usuario ${role}`,
        organization: role === 'producer' ? 'org1' : 'org2',
        permissions: ['*']
    };
    
    console.log(`🔧 Autenticado como: ${req.user.name} (${req.user.role})`);
    next();
};

export default devModeAuth;
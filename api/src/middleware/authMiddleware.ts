/**
 * Middleware de autenticación
 * Para desarrollo, simulamos autenticación básica
 * En producción debería usar JWT y verificación real
 */

import { Request, Response, NextFunction } from 'express';

// Extend Request interface para incluir user
declare global {
    namespace Express {
        interface Request {
            user?: {
                address: string;
                role: string;
                name?: string;
                isVerified?: boolean;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('🔍 Auth middleware - Request:', {
            url: req.url,
            method: req.method,
            hasAuthHeader: !!req.headers.authorization,
            authHeaderPreview: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'none'
        });
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            console.log('❌ Auth middleware - No auth header');
            res.status(401).json({
                success: false,
                error: {
                    message: 'Token de autorización requerido',
                    code: 'NO_TOKEN',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        // Extraer token (formato: "Bearer <token>" o solo "<token>")
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        console.log('🔍 Auth middleware - Token extracted:', {
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...',
            isBearer: authHeader.startsWith('Bearer ')
        });

        if (!token) {
            console.log('❌ Auth middleware - No token after extraction');
            res.status(401).json({
                success: false,
                error: {
                    message: 'Token inválido',
                    code: 'INVALID_TOKEN',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        // Validar JWT token real
        console.log('🔍 Auth middleware - Validating JWT...');
        let user = await validateJWT(token);
        
        // Fallback a usuarios mock solo si la validación JWT falla y estamos en desarrollo
        if (!user && process.env.NODE_ENV === 'development') {
            console.log('🔄 JWT validation failed, trying mock users...');
            user = getMockUser(token);
        }

        if (!user) {
            console.log('❌ Auth middleware - No user found after validation');
            res.status(401).json({
                success: false,
                error: {
                    message: 'Token inválido o expirado',
                    code: 'INVALID_TOKEN',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        console.log('✅ Auth middleware - User authenticated:', {
            address: user.address,
            role: user.role,
            name: user.name
        });

        // Agregar usuario al request
        req.user = user;
        next();

    } catch (error: any) {
        console.error('❌ Error en autenticación:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Error de autenticación',
                code: 'AUTH_ERROR',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Usuarios mock para desarrollo
 */
function getMockUser(token: string) {
    const mockUsers: { [key: string]: any } = {
        'producer-token': {
            address: '0x1234567890123456789012345678901234567890',
            role: 'PRODUCER',
            name: 'Agricultor Juan',
            isVerified: true
        },
        'factory-token': {
            address: '0x2234567890123456789012345678901234567890',
            role: 'FACTORY',
            name: 'Fábrica AlimentosPro',
            isVerified: true
        },
        'processor-token': {
            address: '0x2345678901234567890123456789012345678901',
            role: 'PROCESSOR',
            name: 'Procesadora AlimentosCorp',
            isVerified: true
        },
        'distributor-token': {
            address: '0x3456789012345678901234567890123456789012',
            role: 'DISTRIBUTOR',
            name: 'Distribuidora FreshFood',
            isVerified: true
        },
        'retailer-token': {
            address: '0x4567890123456789012345678901234567890123',
            role: 'RETAILER',
            name: 'Supermercado MegaMart',
            isVerified: true
        },
        'consumer-token': {
            address: '0x5678901234567890123456789012345678901234',
            role: 'CONSUMER',
            name: 'María González',
            isVerified: true
        },
        'admin-token': {
            address: '0x6789012345678901234567890123456789012345',
            role: 'ADMIN',
            name: 'Administrador Sistema',
            isVerified: true
        },
        'demo-token-mobile-app-user': {
            address: '0x7890123456789012345678901234567890123456',
            role: 'CONSUMER',
            name: 'Usuario Demo Móvil',
            isVerified: true
        }
    };

    // Verificar si es un token de MetaMask
    if (token.startsWith('metamask_')) {
        return handleMetaMaskToken(token);
    }

    return mockUsers[token] || null;
}

/**
 * Manejar tokens de MetaMask
 */
function handleMetaMaskToken(token: string) {
    // Formato: metamask_0x{address}_{timestamp} o metamask_0x{address}
    const parts = token.split('_');
    if (parts.length < 2) return null;
    
    const address = parts[1];
    console.log('🦊 Procesando token MetaMask:', { token, address });
    
    // Validar formato de dirección Ethereum
    if (!address.startsWith('0x') || address.length < 10) {
        console.log('❌ Dirección MetaMask inválida:', address);
        return null;
    }
    
    // Todas las direcciones de MetaMask son válidas
    // Asignar rol PRODUCER por defecto, pero permitir escalabilidad de roles
    return {
        address: address,
        role: 'PRODUCER', // Por defecto, asignar rol PRODUCER
        name: `Usuario MetaMask (${address.slice(0, 6)}...${address.slice(-4)})`,
        isVerified: true,
        fabricUserId: `metamask_${address}`,
        mspId: 'Org1MSP',
        organizationName: 'org1.example.com'
    };
}

/**
 * Validación real de JWT 
 */
async function validateJWT(token: string): Promise<any> {
    try {
        // Importar jwt dinámicamente
        const jwt = await import('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        
        const decoded = jwt.default.verify(token, jwtSecret) as any;
        
        console.log('✅ JWT validado exitosamente:', {
            userId: decoded.userId,
            role: decoded.role,
            address: decoded.address
        });
        
        // Mapear el formato del JWT al formato esperado por el middleware
        return {
            address: decoded.address,
            role: decoded.role.toUpperCase(), // Asegurar mayúsculas
            name: decoded.name,
            isVerified: true,
            userId: decoded.userId,
            mspId: decoded.mspId,
            organizationName: decoded.organizationName
        };
        
    } catch (error: any) {
        console.log('❌ Error validando JWT:', error.message);
        return null;
    }
}

/**
 * Middleware para verificar roles específicos
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    message: 'Usuario no autenticado',
                    code: 'NOT_AUTHENTICATED',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: {
                    message: `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        next();
    };
};

/**
 * Middleware para verificar que el usuario está verificado
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.isVerified) {
        res.status(403).json({
            success: false,
            error: {
                message: 'Usuario no verificado. Contacta al administrador.',
                code: 'USER_NOT_VERIFIED',
                timestamp: new Date().toISOString()
            }
        });
        return;
    }

    next();
};
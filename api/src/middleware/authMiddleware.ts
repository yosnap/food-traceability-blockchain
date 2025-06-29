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
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
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

        if (!token) {
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

        // Para desarrollo: decodificar token simple o usar usuarios mock
        let user;
        
        if (process.env.NODE_ENV === 'development') {
            // En desarrollo, usar usuarios mock basados en el token
            user = getMockUser(token);
        } else {
            // En producción, validar JWT real
            user = await validateJWT(token);
        }

        if (!user) {
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
        }
    };

    return mockUsers[token] || null;
}

/**
 * Validación real de JWT para producción
 */
async function validateJWT(token: string): Promise<any> {
    try {
        // TODO: Implementar validación real con jsonwebtoken
        // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        // return decoded;
        
        // Por ahora, retornar null para forzar error en producción sin JWT real
        return null;
        
    } catch (error) {
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
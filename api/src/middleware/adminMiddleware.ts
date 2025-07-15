/**
 * Middleware simple para verificar que el usuario autenticado sea admin
 * Para rutas que requieren privilegios de administrador
 */

import { Request, Response, NextFunction } from 'express';

export interface AdminRequest extends Request {
    user?: {
        address: string;
        role: string;
        name?: string;
        isVerified?: boolean;
        fabricUserId?: string;
        mspId?: string;
        organizationName?: string;
        certificateGenerated?: boolean;
        userId?: string;
        walletAddress?: string;
        certificateId?: string;
    };
    admin?: {
        walletAddress: string;
        role: string;
        isValidated: boolean;
    };
}

/**
 * Middleware para verificar que el usuario autenticado tenga rol de administrador
 */
export const adminMiddleware = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // El usuario debe haber pasado por authMiddleware primero
        const user = req.user;

        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                message: 'Debe estar autenticado para acceder a esta ruta',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar que el rol sea admin
        if (!user.role || user.role.toLowerCase() !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                message: 'Esta operación requiere privilegios de administrador',
                userRole: user.role,
                requiredRole: 'admin',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar que sea el admin principal configurado
        const ADMIN_WALLET = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
        if (user.walletAddress.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
            res.status(403).json({
                success: false,
                error: 'Administrador no autorizado',
                message: 'Solo el administrador principal puede realizar esta operación',
                userWallet: user.walletAddress,
                requiredWallet: ADMIN_WALLET,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Agregar información de admin a la request
        req.admin = {
            walletAddress: user.walletAddress,
            role: user.role,
            isValidated: true
        };

        console.log(`✅ Admin verificado: ${user.walletAddress}`);
        next();

    } catch (error: any) {
        console.error('❌ Error en middleware de admin:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: 'Error verificando privilegios de administrador',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para operaciones específicas de admin que requieren validación adicional
 */
export const adminOperationMiddleware = (operation: string) => {
    return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log(`🔍 Validando operación de admin: ${operation}`);

            // Verificar que el admin esté validado
            if (!req.admin?.isValidated) {
                res.status(403).json({
                    success: false,
                    error: 'Admin no validado',
                    message: 'El administrador debe estar validado para esta operación',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Registrar la operación
            console.log(`🔐 Admin ${req.admin.walletAddress} ejecutando: ${operation}`);

            next();

        } catch (error: any) {
            console.error('❌ Error en operación de admin:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno',
                message: 'Error validando operación de administrador',
                timestamp: new Date().toISOString()
            });
        }
    };
};

export default adminMiddleware;
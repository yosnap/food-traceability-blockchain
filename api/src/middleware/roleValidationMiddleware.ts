/**
 * Middleware para validar que usuarios solo accedan a su rol registrado
 * Previene que un usuario registrado como Producer acceda a rutas de Processor
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que valida que el usuario solo pueda acceder a rutas de su rol registrado
 */
export const validateUserRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                message: 'Se requiere autenticación para acceder a este recurso',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const userRole = req.user.role.toLowerCase();
        const required = requiredRole.toLowerCase();

        // Admin puede acceder a cualquier rol
        if (userRole === 'admin') {
            console.log(`✅ Admin puede acceder a cualquier rol: ${required}`);
            next();
            return;
        }

        // Verificar que el rol del usuario coincida con el requerido
        if (userRole !== required) {
            console.log(`❌ Acceso denegado: Usuario con rol ${userRole} intentó acceder a ${required}`);
            res.status(403).json({
                success: false,
                error: 'Acceso denegado: Rol incorrecto',
                message: `Tu cuenta está registrada como ${userRole.toUpperCase()}. No puedes acceder a recursos de ${required.toUpperCase()}.`,
                details: {
                    userRole: userRole.toUpperCase(),
                    requiredRole: required.toUpperCase(),
                    suggestion: `Usa la página de ${userRole} en su lugar`
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`✅ Acceso permitido: Usuario ${userRole} accede a recurso ${required}`);
        next();
    };
};

/**
 * Middleware específico para cada rol
 */
export const requireProducer = validateUserRole('producer');
export const requireProcessor = validateUserRole('processor');
export const requireDistributor = validateUserRole('distributor');
export const requireRetailer = validateUserRole('retailer');
export const requireConsumer = validateUserRole('consumer');
export const requireAdmin = validateUserRole('admin');

/**
 * Middleware que permite múltiples roles
 */
export const validateMultipleRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                message: 'Se requiere autenticación para acceder a este recurso',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const userRole = req.user.role.toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

        // Admin puede acceder a cualquier recurso
        if (userRole === 'admin') {
            console.log(`✅ Admin puede acceder a recurso que requiere roles: ${allowedRoles.join(', ')}`);
            next();
            return;
        }

        // Verificar que el rol del usuario esté en la lista permitida
        if (!normalizedAllowedRoles.includes(userRole)) {
            console.log(`❌ Acceso denegado: Usuario con rol ${userRole} intentó acceder a recurso que requiere: ${allowedRoles.join(', ')}`);
            res.status(403).json({
                success: false,
                error: 'Acceso denegado: Rol insuficiente',
                message: `Tu rol ${userRole.toUpperCase()} no tiene permisos para este recurso.`,
                details: {
                    userRole: userRole.toUpperCase(),
                    allowedRoles: allowedRoles.map(r => r.toUpperCase()),
                    suggestion: 'Verifica que estés usando la cuenta correcta'
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`✅ Acceso permitido: Usuario ${userRole} accede a recurso (roles permitidos: ${allowedRoles.join(', ')})`);
        next();
    };
};

export default {
    validateUserRole,
    requireProducer,
    requireProcessor,
    requireDistributor,
    requireRetailer,
    requireConsumer,
    requireAdmin,
    validateMultipleRoles
};
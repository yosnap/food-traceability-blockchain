/**
 * Middleware de autenticación X.509 basado en el repositorio de referencia
 * Extrae información del certificado y valida identidades
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../controllers/HLFController.js';

// Interface para el token JWT que incluye info del certificado X.509
interface X509JWTPayload {
    userId: string;
    role: string;
    mspId: string;
    certificateId: string;
    organizationName: string;
    address?: string;
    name?: string;
    iat?: number;
    exp?: number;
}

/**
 * Middleware que valida autenticación X.509 a través de JWT
 * En el repositorio de referencia, el certificado X.509 se valida internamente,
 * pero para la API REST usamos JWT que contiene la info del certificado
 */
export const x509AuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
        // Verificar token JWT en el header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Token de autenticación X.509 requerido',
                message: 'Proporciona un Bearer token con información del certificado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

        // Verificar y decodificar JWT
        const decoded = jwt.verify(token, jwtSecret) as X509JWTPayload;

        // Validar campos requeridos del certificado X.509
        if (!decoded.userId || !decoded.role || !decoded.mspId) {
            res.status(401).json({
                success: false,
                error: 'Token X.509 inválido',
                message: 'El token no contiene información válida del certificado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar MSP ID (debe ser válido para la red Fabric)
        const validMSPs = ['Org1MSP', 'Org2MSP'];
        if (!validMSPs.includes(decoded.mspId)) {
            res.status(401).json({
                success: false,
                error: 'MSP inválido',
                message: `MSP ${decoded.mspId} no está autorizado`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar roles permitidos
        const validRoles = ['admin', 'producer', 'factory', 'retailer', 'consumer'];
        if (!validRoles.includes(decoded.role.toLowerCase())) {
            res.status(401).json({
                success: false,
                error: 'Rol inválido',
                message: `Rol ${decoded.role} no está autorizado`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Agregar información del usuario autenticado al request
        req.user = {
            address: decoded.address || 'unknown',
            userId: decoded.userId,
            role: decoded.role.toLowerCase(),
            mspId: decoded.mspId,
            certificateId: decoded.certificateId,
            name: decoded.name,
            isVerified: true
        } as any;

        console.log(`🔐 Usuario autenticado: ${decoded.userId} (${decoded.role}) - MSP: ${decoded.mspId}`);
        next();

    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({
                success: false,
                error: 'Token X.509 inválido',
                message: 'El token JWT no es válido',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: 'Token X.509 expirado',
                message: 'El token ha expirado, renovar autenticación',
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.error('❌ Error en middleware X.509:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación',
            message: 'Error interno al validar certificado X.509',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware que valida permisos específicos por rol
 * Implementa las restricciones direccionales del repositorio de referencia:
 * Producer → Factory → Retailer → Consumer
 */
export const rolePermissionMiddleware = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const userRole = req.user?.role;

        if (!userRole) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (!allowedRoles.includes(userRole)) {
            res.status(403).json({
                success: false,
                error: 'Permisos insuficientes',
                message: `Rol ${userRole} no autorizado. Roles permitidos: ${allowedRoles.join(', ')}`,
                userRole,
                allowedRoles,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`✅ Permiso validado: ${userRole} puede acceder`);
        next();
    };
};

/**
 * Middleware que valida transferencias direccionales
 * Producer → Factory → Retailer → Consumer
 */
export const validateTransferDirection = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const senderRole = req.user?.role;
    const { targetRole } = req.body; // Rol del destinatario

    if (!senderRole || !targetRole) {
        res.status(400).json({
            success: false,
            error: 'Roles de origen y destino requeridos',
            timestamp: new Date().toISOString()
        });
        return;
    }

    // Definir transferencias válidas según el repositorio de referencia
    const validTransfers: Record<string, string[]> = {
        'producer': ['factory'],
        'factory': ['retailer'],
        'retailer': ['consumer'],
        'consumer': [], // Los consumidores no pueden transferir
        'admin': ['producer', 'factory', 'retailer', 'consumer'] // Admin puede transferir a cualquiera
    };

    const allowedTargets = validTransfers[senderRole] || [];

    if (!allowedTargets.includes(targetRole)) {
        res.status(403).json({
            success: false,
            error: 'Transferencia no permitida',
            message: `${senderRole} no puede transferir a ${targetRole}`,
            validTransfers: validTransfers[senderRole],
            timestamp: new Date().toISOString()
        });
        return;
    }

    console.log(`✅ Transferencia válida: ${senderRole} → ${targetRole}`);
    next();
};
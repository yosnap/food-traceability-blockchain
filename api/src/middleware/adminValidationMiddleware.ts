/**
 * Middleware específico para validación del administrador principal
 * Valida que el administrador tenga certificado válido y firma correcta
 */

import { Request, Response, NextFunction } from 'express';
import { adminValidationService, ADMIN_CONFIG } from '../services/AdminValidationService.js';
import { ethers } from 'ethers';

export interface AdminValidatedRequest extends Request {
    adminUser?: {
        walletAddress: string;
        role: string;
        mspId: string;
        organizationId: string;
        certificateId: string;
        certificateValidated: boolean;
        validatedAt: string;
    };
    adminOperation?: {
        operation: string;
        parameters: any[];
        signature: string;
        validated: boolean;
    };
    adminStatus?: any;
}

/**
 * Middleware principal para validación del administrador
 */
export const adminValidationMiddleware = async (
    req: AdminValidatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🔐 Validando administrador principal...');

        // Obtener datos de autenticación
        const authHeader = req.headers.authorization;
        const adminAddress = req.headers['x-admin-address'] as string || req.body.adminAddress;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido',
                message: 'Proporcione un token Bearer válido',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar que la dirección sea del administrador principal
        if (!adminAddress || adminAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
            res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                message: 'Solo el administrador principal puede realizar esta operación',
                requiredAdmin: ADMIN_CONFIG.walletAddress,
                providedAdmin: adminAddress,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar certificado del administrador
        const certValidation = await adminValidationService.validateAdminCertificate();
        
        if (!certValidation.isValid) {
            res.status(403).json({
                success: false,
                error: 'Certificado de administrador inválido',
                message: certValidation.error,
                certificateStatus: {
                    isValid: false,
                    error: certValidation.error,
                    validatedAt: certValidation.validatedAt
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Establecer usuario administrador validado
        req.adminUser = {
            walletAddress: ADMIN_CONFIG.walletAddress,
            role: ADMIN_CONFIG.role,
            mspId: ADMIN_CONFIG.mspId,
            organizationId: ADMIN_CONFIG.organizationId,
            certificateId: ADMIN_CONFIG.certificateId,
            certificateValidated: true,
            validatedAt: new Date().toISOString()
        };

        console.log('✅ Administrador principal validado correctamente');
        next();

    } catch (error: any) {
        console.error('❌ Error validando administrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error de validación del administrador',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para validar operaciones específicas del administrador
 */
export const adminOperationValidationMiddleware = (operation: string) => {
    return async (req: AdminValidatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log(`🔍 Validando operación de administrador: ${operation}`);

            // Obtener datos de la operación
            const { adminSignature } = req.body;
            const adminAddress = req.adminUser?.walletAddress || req.body.adminAddress;
            
            if (!adminSignature) {
                res.status(400).json({
                    success: false,
                    error: 'Firma de administrador requerida',
                    message: `La operación '${operation}' requiere firma del administrador`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Extraer parámetros de la operación
            const parameters = extractOperationParameters(req, operation);
            
            // Validar la operación con el servicio de validación
            const operationValidation = await adminValidationService.validateAdminOperation(
                operation,
                parameters,
                adminSignature,
                adminAddress
            );

            if (!operationValidation.isValid) {
                res.status(403).json({
                    success: false,
                    error: 'Operación de administrador inválida',
                    message: operationValidation.error,
                    validation: {
                        adminValidated: operationValidation.adminValidated,
                        certificateValidated: operationValidation.certificateValidated,
                        signatureValid: operationValidation.isValid
                    },
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Establecer información de la operación validada
            req.adminOperation = {
                operation,
                parameters,
                signature: adminSignature,
                validated: true
            };

            console.log(`✅ Operación '${operation}' validada correctamente`);
            next();

        } catch (error: any) {
            console.error('❌ Error validando operación:', error);
            res.status(500).json({
                success: false,
                error: 'Error validando operación',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};

/**
 * Middleware para inicializar el administrador al iniciar la aplicación
 */
export const initializeAdminMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🚀 Inicializando administrador principal...');

        // Verificar estado del administrador
        const adminStatus = await adminValidationService.getAdminStatus();
        
        if (!adminStatus.certificateValid) {
            console.log('🔧 Certificado no válido, inicializando administrador...');
            
            // Inicializar administrador
            const initResult = await adminValidationService.initializeAdmin();
            
            if (!initResult.isValid) {
                console.error('❌ Error inicializando administrador:', initResult.error);
                res.status(500).json({
                    success: false,
                    error: 'Error inicializando administrador',
                    message: initResult.error,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            console.log('✅ Administrador inicializado correctamente');
        } else {
            console.log('✅ Administrador ya inicializado');
        }

        next();

    } catch (error: any) {
        console.error('❌ Error en inicialización del administrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error en inicialización',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para verificar el estado del administrador
 */
export const adminStatusMiddleware = async (
    req: AdminValidatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminStatus = await adminValidationService.getAdminStatus();
        
        // Agregar información del estado del administrador a la respuesta
        req.adminStatus = adminStatus;
        
        next();

    } catch (error: any) {
        console.error('❌ Error obteniendo estado del administrador:', error);
        next(); // Continuar aunque falle, no es crítico
    }
};

/**
 * Extrae parámetros de la operación según el tipo
 */
function extractOperationParameters(req: AdminValidatedRequest, operation: string): any[] {
    const { body, params } = req;
    
    switch (operation) {
        case 'registerUser':
            return [body.walletAddress, body.role, body.certificatePem];
        
        case 'revokeUser':
            return [params.walletAddress];
        
        case 'updateUser':
            return [params.walletAddress, body.newRole];
        
        case 'createCertificate':
            return [body.walletAddress, body.role];
        
        case 'revokeCertificate':
            return [body.walletAddress];
        
        default:
            return Object.values(body);
    }
}

/**
 * Middleware para validar que la wallet del administrador esté conectada
 */
export const adminWalletMiddleware = async (
    req: AdminValidatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminAddress = req.headers['x-admin-address'] as string || req.body.adminAddress;
        
        if (!adminAddress) {
            res.status(400).json({
                success: false,
                error: 'Dirección de administrador requerida',
                message: 'Proporcione la dirección del administrador en el header x-admin-address',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar formato de la dirección
        if (!ethers.isAddress(adminAddress)) {
            res.status(400).json({
                success: false,
                error: 'Dirección de administrador inválida',
                message: 'La dirección proporcionada no es una dirección Ethereum válida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar que sea la dirección del administrador principal
        if (adminAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
            res.status(403).json({
                success: false,
                error: 'Administrador no autorizado',
                message: 'Solo el administrador principal puede realizar esta operación',
                requiredAdmin: ADMIN_CONFIG.walletAddress,
                providedAdmin: adminAddress,
                timestamp: new Date().toISOString()
            });
            return;
        }

        next();

    } catch (error: any) {
        console.error('❌ Error validando wallet del administrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error validando wallet',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para renovar certificado del administrador
 */
export const renewAdminCertificateMiddleware = async (
    req: AdminValidatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🔄 Renovando certificado de administrador...');

        const renewResult = await adminValidationService.renewAdminCertificate();
        
        if (!renewResult.isValid) {
            res.status(500).json({
                success: false,
                error: 'Error renovando certificado',
                message: renewResult.error,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log('✅ Certificado renovado correctamente');
        next();

    } catch (error: any) {
        console.error('❌ Error renovando certificado:', error);
        res.status(500).json({
            success: false,
            error: 'Error renovando certificado',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Exportar configuración del administrador
export { ADMIN_CONFIG };
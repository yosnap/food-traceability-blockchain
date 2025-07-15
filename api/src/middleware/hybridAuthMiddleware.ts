/**
 * Middleware híbrido que combina Metamask para autenticación
 * y certificados .pem para firmar operaciones
 */

import { Request, Response, NextFunction } from 'express';
import { hybridAuthService, SignedOperation } from '../services/HybridAuthService.js';
import { ADMIN_CONFIG } from '../services/AdminValidationService.js';
import jwt from 'jsonwebtoken';

export interface HybridAuthRequest extends Request {
    admin?: {
        walletAddress: string;
        role: string;
        sessionToken: string;
        isAuthenticated: boolean;
        certificateValidated: boolean;
    };
    signedOperation?: SignedOperation;
}

/**
 * Middleware para verificar autenticación con Metamask
 */
export const metamaskAuthMiddleware = async (
    req: HybridAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🦊 Verificando autenticación con Metamask...');

        const authHeader = req.headers.authorization;
        const walletAddress = req.headers['x-wallet-address'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Token de autenticación requerido',
                message: 'Debe autenticarse primero con Metamask',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const token = authHeader.substring(7);

        // Verificar token JWT
        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'admin-secret'
            ) as any;

            // Verificar que sea el administrador
            if (decoded.walletAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                res.status(403).json({
                    success: false,
                    error: 'Acceso denegado',
                    message: 'Solo el administrador principal puede acceder',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar sesión activa
            const session = hybridAuthService.getSession(decoded.walletAddress);
            if (!session || !session.isAuthenticated) {
                res.status(401).json({
                    success: false,
                    error: 'Sesión expirada',
                    message: 'Debe autenticarse nuevamente con Metamask',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            req.admin = {
                walletAddress: decoded.walletAddress,
                role: 'admin',
                sessionToken: token,
                isAuthenticated: true,
                certificateValidated: session.certificateValidated
            };

            console.log('✅ Metamask autenticado correctamente');
            next();

        } catch (error: any) {
            res.status(401).json({
                success: false,
                error: 'Token inválido',
                message: 'El token de autenticación no es válido',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error en autenticación Metamask:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para verificar operaciones firmadas con certificado
 */
export const certificateSignedOperationMiddleware = (expectedOperation: string) => {
    return async (req: HybridAuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log(`🔐 Verificando operación firmada: ${expectedOperation}`);

            const signedOperationHeader = req.headers['x-signed-operation'] as string;
            
            if (!signedOperationHeader) {
                res.status(400).json({
                    success: false,
                    error: 'Operación no firmada',
                    message: 'La operación debe estar firmada con el certificado del administrador',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Parsear operación firmada
            let signedOperation: SignedOperation;
            try {
                signedOperation = JSON.parse(signedOperationHeader);
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: 'Formato de operación inválido',
                    message: 'El formato de la operación firmada no es válido',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar que la operación sea la esperada
            if (signedOperation.operation !== expectedOperation) {
                res.status(400).json({
                    success: false,
                    error: 'Operación incorrecta',
                    message: `Se esperaba '${expectedOperation}', se recibió '${signedOperation.operation}'`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar la operación firmada
            const verification = await hybridAuthService.verifySignedOperation(
                signedOperation,
                req.admin!.walletAddress
            );

            if (!verification.isValid) {
                res.status(403).json({
                    success: false,
                    error: 'Firma inválida',
                    message: verification.error,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar que los parámetros coincidan con el request
            if (!validateOperationParameters(signedOperation, req)) {
                res.status(400).json({
                    success: false,
                    error: 'Parámetros inválidos',
                    message: 'Los parámetros firmados no coinciden con la solicitud',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            req.signedOperation = signedOperation;

            console.log('✅ Operación firmada verificada correctamente');
            console.log(`📋 Detalles: ${JSON.stringify(verification.details)}`);
            next();

        } catch (error: any) {
            console.error('❌ Error verificando operación firmada:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando operación',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};

/**
 * Middleware combinado: Metamask + Certificado
 */
export const hybridAuthMiddleware = (operation: string) => {
    return [
        metamaskAuthMiddleware,
        certificateSignedOperationMiddleware(operation)
    ];
};

/**
 * Endpoint para autenticación inicial con Metamask
 */
export const loginWithMetamask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            res.status(400).json({
                success: false,
                error: 'Datos incompletos',
                message: 'Se requiere walletAddress, signature y message',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await hybridAuthService.authenticateWithMetamask(
            walletAddress,
            signature,
            message
        );

        if (result.success) {
            // Obtener información del certificado
            const certInfo = await hybridAuthService.getAdminCertificateInfo();

            res.json({
                success: true,
                message: 'Autenticación exitosa',
                token: result.sessionToken,
                admin: {
                    walletAddress,
                    role: 'admin',
                    certificateInfo: certInfo
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Autenticación fallida',
                message: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error en autenticación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Endpoint para firmar operaciones con certificado
 */
export const signOperationEndpoint = async (req: HybridAuthRequest, res: Response): Promise<void> => {
    try {
        const { operation, parameters } = req.body;

        if (!operation || !parameters) {
            res.status(400).json({
                success: false,
                error: 'Datos incompletos',
                message: 'Se requiere operation y parameters',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await hybridAuthService.signOperationWithCertificate(
            req.admin!.sessionToken,
            operation,
            parameters
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Operación firmada exitosamente',
                signedOperation: result.signedOperation,
                instructions: 'Ahora firme con Metamask para confirmar',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Error firmando operación',
                message: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error firmando operación:', error);
        res.status(500).json({
            success: false,
            error: 'Error en firma',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Valida que los parámetros de la operación coincidan
 */
function validateOperationParameters(
    signedOperation: SignedOperation,
    req: HybridAuthRequest
): boolean {
    const { parameters } = signedOperation;
    const { body, params } = req;

    switch (signedOperation.operation) {
        case 'registerUser':
            return parameters[0] === body.walletAddress && 
                   parameters[1] === body.role;

        case 'revokeUser':
            return parameters[0] === params.walletAddress;

        case 'updateUser':
            return parameters[0] === params.walletAddress && 
                   parameters[1] === body.newRole;

        default:
            return true;
    }
}
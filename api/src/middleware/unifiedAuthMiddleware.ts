/**
 * Middleware unificado de autenticación para todos los roles
 * Metamask para identidad + Certificados .pem para firmar
 */

import { Request, Response, NextFunction } from 'express';
import { unifiedAuthService, SignedOperation } from '../services/UnifiedAuthService.js';
import jwt from 'jsonwebtoken';

export interface UnifiedAuthRequest extends Request {
    user?: {
        address: string;
        walletAddress: string;  // Identidad desde Metamask
        role: string;
        organizationId: string;
        mspId: string;
        hasCertificate: boolean;
        sessionToken: string;
        name?: string;
        isVerified?: boolean;
    };
    signedOperation?: SignedOperation;
}

/**
 * Middleware para verificar identidad con Metamask
 */
export const identityMiddleware = async (
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🦊 Verificando identidad del usuario...');

        const authHeader = req.headers.authorization;
        const walletAddress = req.headers['x-wallet-address'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                message: 'Debe conectarse con Metamask primero',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const token = authHeader.substring(7);

        try {
            // Verificar token JWT
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'unified-auth-secret'
            ) as any;

            // Verificar que coincida con el header
            if (walletAddress && decoded.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                res.status(401).json({
                    success: false,
                    error: 'Identidad no coincide',
                    message: 'La wallet del token no coincide con la proporcionada',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar sesión activa
            const session = unifiedAuthService.getSession(decoded.walletAddress);
            if (!session || !session.isAuthenticated) {
                res.status(401).json({
                    success: false,
                    error: 'Sesión expirada',
                    message: 'Debe autenticarse nuevamente con Metamask',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Establecer usuario en el request
            req.user = {
                address: decoded.walletAddress,
                walletAddress: decoded.walletAddress,
                role: decoded.role,
                organizationId: decoded.organizationId,
                mspId: decoded.mspId,
                hasCertificate: session.certificateLoaded,
                sessionToken: token,
                name: decoded.name,
                isVerified: true
            } as any;

            console.log(`✅ Identidad verificada: ${decoded.walletAddress} (${decoded.role})`);
            next();

        } catch (error: any) {
            res.status(401).json({
                success: false,
                error: 'Token inválido',
                message: 'El token de identidad no es válido',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error verificando identidad:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para verificar firma de operación con certificado
 */
export const signedOperationMiddleware = (expectedOperation: string) => {
    return async (req: UnifiedAuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log(`🔐 Verificando firma de operación: ${expectedOperation}`);

            const signedOperationHeader = req.headers['x-signed-operation'] as string;
            
            if (!signedOperationHeader) {
                res.status(400).json({
                    success: false,
                    error: 'Operación no firmada',
                    message: 'La operación debe estar firmada con el certificado del usuario',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar que el usuario tenga certificado
            if (!req.user?.hasCertificate) {
                res.status(403).json({
                    success: false,
                    error: 'Sin certificado',
                    message: 'El usuario no tiene certificado para firmar operaciones',
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
                    error: 'Formato inválido',
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

            // Verificar que el firmante sea el usuario actual
            if (signedOperation.walletAddress.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
                res.status(403).json({
                    success: false,
                    error: 'Firmante incorrecto',
                    message: 'La operación debe ser firmada por el usuario actual',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar la firma
            const verification = await unifiedAuthService.verifySignedOperation(
                signedOperation,
                req.user.walletAddress
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

            // Verificar parámetros
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

            console.log(`✅ Operación firmada verificada: ${signedOperation.walletAddress}`);
            next();

        } catch (error: any) {
            console.error('❌ Error verificando operación:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando firma',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};

/**
 * Middleware para verificar roles permitidos
 */
export const roleMiddleware = (allowedRoles: string[]) => {
    return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
        try {
            const userRole = req.user?.role?.toLowerCase();
            
            if (!userRole) {
                res.status(401).json({
                    success: false,
                    error: 'Rol no encontrado',
                    message: 'No se pudo determinar el rol del usuario',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
            
            if (!normalizedAllowedRoles.includes(userRole)) {
                res.status(403).json({
                    success: false,
                    error: 'Acceso denegado',
                    message: `Rol requerido: ${allowedRoles.join(', ')}. Rol actual: ${userRole}`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`✅ Rol autorizado: ${userRole}`);
            next();

        } catch (error: any) {
            console.error('❌ Error verificando rol:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando permisos',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};

/**
 * Middleware combinado: identidad + firma + rol
 */
export const protectedOperationMiddleware = (operation: string, allowedRoles: string[]) => {
    return [
        identityMiddleware,
        roleMiddleware(allowedRoles),
        signedOperationMiddleware(operation)
    ];
};

/**
 * Endpoint para login con Metamask
 */
export const loginEndpoint = async (req: Request, res: Response): Promise<void> => {
    try {
        const { walletAddress, signature, message, role } = req.body;

        if (!walletAddress || !signature || !message || !role) {
            res.status(400).json({
                success: false,
                error: 'Datos incompletos',
                message: 'Se requiere walletAddress, signature, message y role',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await unifiedAuthService.authenticateUser(
            walletAddress,
            signature,
            message,
            role
        );

        if (result.success) {
            const session = unifiedAuthService.getSession(walletAddress);
            
            res.json({
                success: true,
                message: 'Autenticación exitosa',
                token: result.sessionToken,
                user: {
                    walletAddress,
                    role,
                    organizationId: session!.identity.organizationId,
                    mspId: session!.identity.mspId,
                    hasCertificate: session!.certificateLoaded
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
 * Endpoint para firmar operaciones
 */
export const signOperationEndpoint = async (req: UnifiedAuthRequest, res: Response): Promise<void> => {
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

        if (!req.user?.hasCertificate) {
            res.status(403).json({
                success: false,
                error: 'Sin certificado',
                message: 'Usuario no tiene certificado para firmar',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await unifiedAuthService.signOperationWithUserCertificate(
            req.user.walletAddress,
            operation,
            parameters
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Operación firmada exitosamente',
                signedOperation: result.signedOperation,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Error firmando',
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
 * Valida parámetros de operación
 */
function validateOperationParameters(
    signedOperation: SignedOperation,
    req: UnifiedAuthRequest
): boolean {
    const { parameters } = signedOperation;
    const { body, params } = req;

    switch (signedOperation.operation) {
        case 'registerUser':
            return parameters[0] === body.walletAddress && 
                   parameters[1] === body.role;

        case 'createProduct':
            return parameters[0] === body.productId &&
                   parameters[1] === body.name;

        case 'transferProduct':
            return parameters[0] === body.productId &&
                   parameters[1] === body.toAddress;

        case 'updateProductStatus':
            return parameters[0] === params.productId &&
                   parameters[1] === body.status;

        default:
            return true;
    }
}
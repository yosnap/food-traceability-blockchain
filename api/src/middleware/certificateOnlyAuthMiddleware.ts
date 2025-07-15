/**
 * Middleware de autenticación que usa SOLO certificados .pem
 * No depende de Metamask, solo validación con certificados X.509
 */

import { Request, Response, NextFunction } from 'express';
import { certificateSigningService } from '../services/CertificateSigningService.js';
import { adminValidationService, ADMIN_CONFIG } from '../services/AdminValidationService.js';

export interface CertificateAuthRequest extends Request {
    admin?: {
        certificateId: string;
        subject: string;
        issuer: string;
        serialNumber: string;
        organization: string;
        validatedAt: string;
        isAdminPrincipal: boolean;
    };
    operationSignature?: {
        signature: string;
        operationData: string;
        verified: boolean;
        verifiedAt: string;
    };
}

/**
 * Middleware para autenticación usando SOLO certificados
 */
export const certificateOnlyAuthMiddleware = async (
    req: CertificateAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🔐 Validando autenticación con certificado .pem...');

        // Obtener firma y datos de la operación
        const operationSignature = req.headers['x-operation-signature'] as string;
        const operationData = req.headers['x-operation-data'] as string;
        const certificatePem = req.headers['x-certificate'] as string;

        if (!operationSignature || !operationData) {
            res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                message: 'Debe proporcionar firma de operación con certificado',
                requiredHeaders: ['x-operation-signature', 'x-operation-data'],
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar la firma con el certificado
        const verificationResult = await certificateSigningService.verifySignature(
            operationData,
            operationSignature,
            certificatePem
        );

        if (!verificationResult.isValid) {
            res.status(401).json({
                success: false,
                error: 'Firma inválida',
                message: verificationResult.error,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Parsear datos de la operación
        let operation;
        try {
            operation = JSON.parse(operationData);
        } catch (error) {
            res.status(400).json({
                success: false,
                error: 'Datos de operación inválidos',
                message: 'El formato de los datos de operación no es válido',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar timestamp de la operación (máximo 5 minutos)
        const operationTime = new Date(operation.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - operationTime.getTime();

        if (timeDiff > 5 * 60 * 1000) {
            res.status(401).json({
                success: false,
                error: 'Operación expirada',
                message: 'La firma tiene más de 5 minutos de antigüedad',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Establecer información del administrador
        req.admin = {
            certificateId: verificationResult.signerInfo!.serialNumber,
            subject: verificationResult.signerInfo!.commonName,
            issuer: verificationResult.signerInfo!.issuer,
            serialNumber: verificationResult.signerInfo!.serialNumber,
            organization: verificationResult.signerInfo!.organization,
            validatedAt: new Date().toISOString(),
            isAdminPrincipal: verificationResult.signerInfo!.commonName === 'AdminPrincipal'
        };

        req.operationSignature = {
            signature: operationSignature,
            operationData: operationData,
            verified: true,
            verifiedAt: new Date().toISOString()
        };

        console.log(`✅ Certificado validado: ${req.admin.subject}`);
        next();

    } catch (error: any) {
        console.error('❌ Error en autenticación con certificado:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para requerir certificado del administrador principal
 */
export const requireAdminCertificateMiddleware = async (
    req: CertificateAuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Verificar que el certificado sea del administrador principal
        if (!req.admin || !req.admin.isAdminPrincipal) {
            res.status(403).json({
                success: false,
                error: 'Acceso denegado',
                message: 'Esta operación requiere certificado del administrador principal',
                requiredSubject: 'AdminPrincipal',
                providedSubject: req.admin?.subject,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar que el certificado del admin esté vigente
        const certValidation = await adminValidationService.validateAdminCertificate();
        
        if (!certValidation.isValid) {
            res.status(403).json({
                success: false,
                error: 'Certificado de administrador inválido',
                message: certValidation.error,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log('✅ Certificado de administrador principal validado');
        next();

    } catch (error: any) {
        console.error('❌ Error validando certificado de admin:', error);
        res.status(500).json({
            success: false,
            error: 'Error validando certificado',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para validar operaciones específicas
 */
export const validateOperationMiddleware = (expectedOperation: string) => {
    return async (req: CertificateAuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.operationSignature) {
                res.status(400).json({
                    success: false,
                    error: 'Operación no validada',
                    message: 'La operación debe ser validada primero',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Parsear datos de la operación
            const operation = JSON.parse(req.operationSignature.operationData);

            // Verificar que la operación sea la esperada
            if (operation.operation !== expectedOperation) {
                res.status(400).json({
                    success: false,
                    error: 'Operación incorrecta',
                    message: `Se esperaba operación '${expectedOperation}', se recibió '${operation.operation}'`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar que los parámetros de la operación coincidan con el request
            if (!validateOperationParameters(operation, req)) {
                res.status(400).json({
                    success: false,
                    error: 'Parámetros inválidos',
                    message: 'Los parámetros de la operación no coinciden con la solicitud',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`✅ Operación '${expectedOperation}' validada`);
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
 * Middleware para inicializar el servicio de certificados
 */
export const initializeCertificateServiceMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Verificar si el servicio ya está inicializado
        if (!certificateSigningService.validateCertificate()) {
            console.log('🔧 Inicializando servicio de certificados...');
            await certificateSigningService.initialize();
            console.log('✅ Servicio de certificados inicializado');
        }

        next();

    } catch (error: any) {
        console.error('❌ Error inicializando servicio de certificados:', error);
        res.status(500).json({
            success: false,
            error: 'Error de inicialización',
            message: 'No se pudo inicializar el servicio de certificados',
            detail: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Valida que los parámetros de la operación coincidan con el request
 */
function validateOperationParameters(operation: any, req: CertificateAuthRequest): boolean {
    const { parameters } = operation;
    const { body, params } = req;

    switch (operation.operation) {
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

/**
 * Middleware para generar firma de operación (para testing)
 */
export const generateOperationSignatureMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Solo en modo desarrollo
        if (process.env.NODE_ENV !== 'development') {
            next();
            return;
        }

        // Si ya tiene firma, continuar
        if (req.headers['x-operation-signature']) {
            next();
            return;
        }

        // Extraer operación del path
        const pathParts = req.path.split('/');
        let operation = 'unknown';
        
        if (req.method === 'POST' && pathParts.includes('users')) {
            operation = 'registerUser';
        } else if (req.method === 'DELETE' && pathParts.includes('users')) {
            operation = 'revokeUser';
        } else if (req.method === 'PUT' && pathParts.includes('users')) {
            operation = 'updateUser';
        }

        // Generar firma automática (solo para desarrollo)
        const parameters = extractParameters(req, operation);
        const result = await certificateSigningService.signAdminOperation(operation, parameters);

        // Agregar headers
        req.headers['x-operation-signature'] = result.operationSignature.signature;
        req.headers['x-operation-data'] = result.operationData;

        console.log('🔧 Firma de operación generada automáticamente (modo desarrollo)');
        next();

    } catch (error: any) {
        console.error('❌ Error generando firma:', error);
        // En desarrollo, continuar sin firma
        next();
    }
};

/**
 * Extrae parámetros según la operación
 */
function extractParameters(req: Request, operation: string): any[] {
    const { body, params } = req;
    
    switch (operation) {
        case 'registerUser':
            return [body.walletAddress, body.role];
        
        case 'revokeUser':
            return [params.walletAddress];
        
        case 'updateUser':
            return [params.walletAddress, body.newRole];
        
        default:
            return [];
    }
}
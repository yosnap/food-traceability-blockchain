/**
 * Middleware para autenticación con certificados .pem
 * Verifica firmas usando certificados X.509 y wallets de Metamask
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { userCertificateService } from '../services/UserCertificateService.js';

export interface CertificateAuthenticatedRequest extends Request {
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
        certificatePem?: string;
    };
    certificateAuth?: {
        isValid: boolean;
        verificationMethod: 'metamask' | 'certificate' | 'hybrid';
        verifiedAt: string;
    };
}

export interface SignatureVerificationRequest {
    walletAddress: string;
    signature: string;
    message: string;
    certificatePem?: string;
    timestamp?: string;
}

/**
 * Middleware principal para autenticación con certificados
 */
export const certificateAuthMiddleware = async (
    req: CertificateAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log('🔐 Iniciando autenticación con certificados...');

        // Verificar si hay token JWT (método tradicional)
        const authHeader = req.headers.authorization;
        let jwtUser = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                jwtUser = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
                console.log('✅ Token JWT válido encontrado');
            } catch (error) {
                console.log('⚠️ Token JWT inválido o expirado');
            }
        }

        // Verificar autenticación por firma
        const signatureData = extractSignatureData(req);
        
        if (!signatureData && !jwtUser) {
            res.status(401).json({
                success: false,
                error: 'Autenticación requerida',
                message: 'Proporcione token JWT o datos de firma',
                timestamp: new Date().toISOString()
            });
            return;
        }

        let authenticatedUser;
        let authMethod: 'metamask' | 'certificate' | 'hybrid' = 'metamask';

        if (signatureData) {
            // Verificar firma digital
            const verificationResult = await verifySignature(signatureData);
            
            if (!verificationResult.isValid) {
                res.status(401).json({
                    success: false,
                    error: 'Firma inválida',
                    message: verificationResult.error,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            authenticatedUser = verificationResult.user;
            authMethod = verificationResult.method;
        } else if (jwtUser) {
            // Usar datos del JWT
            authenticatedUser = {
                address: jwtUser.address || jwtUser.userId || jwtUser.walletAddress,
                walletAddress: jwtUser.userId || jwtUser.walletAddress,
                role: jwtUser.role,
                name: jwtUser.name,
                isVerified: true,
                mspId: jwtUser.mspId || (jwtUser.role === 'producer' ? 'Org1MSP' : 'Org2MSP'),
                organizationName: jwtUser.organizationId || (jwtUser.role === 'producer' ? 'org1' : 'org2'),
                certificateId: jwtUser.certificateId || 'jwt-auth'
            };
            authMethod = 'metamask';
        }

        // Establecer usuario autenticado
        req.user = authenticatedUser;
        req.certificateAuth = {
            isValid: true,
            verificationMethod: authMethod,
            verifiedAt: new Date().toISOString()
        };

        console.log(`✅ Usuario autenticado: ${authenticatedUser?.address} (${authMethod})`);
        next();

    } catch (error: any) {
        console.error('❌ Error en autenticación con certificados:', error);
        res.status(500).json({
            success: false,
            error: 'Error de autenticación',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Middleware para verificar roles específicos
 */
export const certificateRoleMiddleware = (allowedRoles: string[]) => {
    return (req: CertificateAuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            const userRole = req.user?.role?.toLowerCase();
            
            if (!userRole) {
                res.status(401).json({
                    success: false,
                    error: 'Rol de usuario no encontrado',
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

            console.log(`✅ Acceso autorizado para rol: ${userRole}`);
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
 * Extrae datos de firma de la petición
 */
function extractSignatureData(req: Request): SignatureVerificationRequest | null {
    const { walletAddress, signature, message, certificatePem } = req.body;
    
    // También verificar headers
    const headerWallet = req.headers['x-wallet-address'] as string;
    const headerSignature = req.headers['x-signature'] as string;
    const headerMessage = req.headers['x-message'] as string;
    const headerCertificate = req.headers['x-certificate'] as string;

    if (walletAddress && signature && message) {
        return {
            walletAddress,
            signature,
            message,
            certificatePem,
            timestamp: new Date().toISOString()
        };
    }

    if (headerWallet && headerSignature && headerMessage) {
        return {
            walletAddress: headerWallet,
            signature: headerSignature,
            message: headerMessage,
            certificatePem: headerCertificate,
            timestamp: new Date().toISOString()
        };
    }

    return null;
}

/**
 * Verifica una firma digital
 */
async function verifySignature(signatureData: SignatureVerificationRequest): Promise<{
    isValid: boolean;
    user?: any;
    method: 'metamask' | 'certificate' | 'hybrid';
    error?: string;
}> {
    try {
        const { walletAddress, signature, message, certificatePem } = signatureData;

        // Verificar formato de dirección
        if (!ethers.isAddress(walletAddress)) {
            return {
                isValid: false,
                method: 'metamask',
                error: 'Dirección de wallet inválida'
            };
        }

        // Método 1: Verificación con Metamask (ethers.js)
        const metamaskVerification = await verifyMetamaskSignature(walletAddress, signature, message);
        
        if (!metamaskVerification.isValid) {
            return {
                isValid: false,
                method: 'metamask',
                error: metamaskVerification.error
            };
        }

        // Método 2: Verificación con certificado .pem (si se proporciona)
        let certificateVerification = { isValid: true, error: null };
        
        if (certificatePem) {
            certificateVerification = await verifyCertificateSignature(walletAddress, certificatePem, message);
            
            if (!certificateVerification.isValid) {
                console.log('⚠️ Certificado inválido, continuando con verificación Metamask');
            }
        }

        // Determinar método de verificación
        let verificationMethod: 'metamask' | 'certificate' | 'hybrid' = 'metamask';
        
        if (certificatePem && certificateVerification.isValid) {
            verificationMethod = 'hybrid';
        } else if (certificatePem) {
            verificationMethod = 'certificate';
        }

        // Obtener información del usuario
        const user = await getUserInfo(walletAddress);

        return {
            isValid: true,
            user,
            method: verificationMethod
        };

    } catch (error: any) {
        console.error('❌ Error verificando firma:', error);
        return {
            isValid: false,
            method: 'metamask',
            error: error.message
        };
    }
}

/**
 * Verifica firma con Metamask usando ethers.js
 */
async function verifyMetamaskSignature(walletAddress: string, signature: string, message: string): Promise<{
    isValid: boolean;
    error?: string;
}> {
    try {
        // Validar formato de la firma
        if (!signature.startsWith('0x') || signature.length !== 132) {
            return {
                isValid: false,
                error: 'Formato de firma inválido'
            };
        }

        // Recrear el hash del mensaje
        const messageHash = ethers.hashMessage(message);
        
        // Recuperar la dirección del firmante
        const recoveredAddress = ethers.recoverAddress(messageHash, signature);
        
        // Verificar que coincida con la dirección proporcionada
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return {
                isValid: false,
                error: 'La firma no coincide con la dirección de la wallet'
            };
        }

        console.log(`✅ Firma Metamask verificada: ${recoveredAddress}`);
        return { isValid: true };

    } catch (error: any) {
        console.error('❌ Error verificando firma Metamask:', error);
        return {
            isValid: false,
            error: `Error verificando firma Metamask: ${error.message}`
        };
    }
}

/**
 * Verifica certificado .pem
 */
async function verifyCertificateSignature(walletAddress: string, certificatePem: string, message: string): Promise<{
    isValid: boolean;
    error: any;
}> {
    try {
        // Verificar formato del certificado
        if (!certificatePem.includes('-----BEGIN CERTIFICATE-----') || 
            !certificatePem.includes('-----END CERTIFICATE-----')) {
            return {
                isValid: false,
                error: 'Formato de certificado .pem inválido'
            };
        }

        // Usar el servicio de certificados para verificar
        const isValid = await userCertificateService.verifyCertificate(walletAddress, certificatePem);
        
        if (!isValid) {
            return {
                isValid: false,
                error: 'Certificado no válido o revocado'
            };
        }

        console.log(`✅ Certificado .pem verificado para: ${walletAddress}`);
        return { isValid: true, error: null };

    } catch (error: any) {
        console.error('❌ Error verificando certificado:', error);
        return {
            isValid: false,
            error: `Error verificando certificado: ${error.message}`
        };
    }
}

/**
 * Obtiene información del usuario
 */
async function getUserInfo(walletAddress: string): Promise<any> {
    try {
        // Aquí se implementaría la lógica para obtener información del usuario
        // desde el blockchain o base de datos
        
        // Por ahora, devolver estructura básica
        return {
            address: walletAddress,
            walletAddress,
            role: 'producer', // Esto debería obtenerse del blockchain
            name: `Usuario ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            isVerified: true,
            mspId: 'Org1MSP',
            organizationName: 'org1',
            certificateId: `cert-${walletAddress.slice(2, 8)}`,
            verifiedAt: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('❌ Error obteniendo información del usuario:', error);
        throw error;
    }
}

/**
 * Middleware para operaciones que requieren firma específica
 */
export const requireSignatureMiddleware = (expectedOperation: string) => {
    return (req: CertificateAuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            const signatureData = extractSignatureData(req);
            
            if (!signatureData) {
                res.status(400).json({
                    success: false,
                    error: 'Firma requerida para esta operación',
                    message: `Operación '${expectedOperation}' requiere firma digital`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar que el mensaje incluye la operación esperada
            if (!signatureData.message.includes(expectedOperation)) {
                res.status(400).json({
                    success: false,
                    error: 'Mensaje de firma inválido',
                    message: `El mensaje debe incluir la operación: ${expectedOperation}`,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`✅ Firma requerida verificada para operación: ${expectedOperation}`);
            next();

        } catch (error: any) {
            console.error('❌ Error verificando firma requerida:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando firma',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};
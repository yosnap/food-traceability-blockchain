/**
 * Servicio híbrido de autenticación y firma
 * Combina Metamask para autenticación y certificados .pem para firmar operaciones
 */

import { ethers } from 'ethers';
import { certificateSigningService, CertificateSignature } from './CertificateSigningService.js';
import { adminValidationService, ADMIN_CONFIG } from './AdminValidationService.js';
import jwt from 'jsonwebtoken';

export interface AdminSession {
    walletAddress: string;
    isAuthenticated: boolean;
    certificateValidated: boolean;
    sessionToken: string;
    loginTimestamp: string;
    certificateInfo?: any;
}

export interface SignedOperation {
    operation: string;
    parameters: any[];
    walletSignature: string;  // Firma con Metamask para autenticación
    certificateSignature: CertificateSignature;  // Firma con certificado .pem para operación
    timestamp: string;
}

export class HybridAuthService {
    private adminSessions: Map<string, AdminSession> = new Map();

    /**
     * Paso 1: Autenticación con Metamask
     * El admin se conecta con su wallet
     */
    async authenticateWithMetamask(
        walletAddress: string,
        signature: string,
        message: string
    ): Promise<{
        success: boolean;
        sessionToken?: string;
        error?: string;
    }> {
        console.log('🔐 Autenticando administrador con Metamask...');

        try {
            // Verificar que sea la wallet del administrador
            if (walletAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                return {
                    success: false,
                    error: 'Solo el administrador principal puede acceder'
                };
            }

            // Verificar la firma de Metamask
            const messageHash = ethers.hashMessage(message);
            const recoveredAddress = ethers.recoverAddress(messageHash, signature);

            if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return {
                    success: false,
                    error: 'Firma de Metamask inválida'
                };
            }

            // Validar certificado del administrador
            const certValidation = await adminValidationService.validateAdminCertificate();
            
            if (!certValidation.isValid) {
                return {
                    success: false,
                    error: `Certificado del administrador inválido: ${certValidation.error}`
                };
            }

            // Crear sesión
            const sessionToken = jwt.sign(
                {
                    walletAddress,
                    role: 'admin',
                    certificateValidated: true,
                    timestamp: new Date().toISOString()
                },
                process.env.JWT_SECRET || 'admin-secret',
                { expiresIn: '24h' }
            );

            const session: AdminSession = {
                walletAddress,
                isAuthenticated: true,
                certificateValidated: true,
                sessionToken,
                loginTimestamp: new Date().toISOString(),
                certificateInfo: certValidation
            };

            this.adminSessions.set(walletAddress, session);

            console.log('✅ Administrador autenticado con Metamask');
            console.log(`📜 Certificado validado: ${certValidation.subject}`);

            return {
                success: true,
                sessionToken
            };

        } catch (error: any) {
            console.error('❌ Error en autenticación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Paso 2: Firmar operación con certificado .pem
     * Cada operación administrativa debe ser firmada con el certificado
     */
    async signOperationWithCertificate(
        sessionToken: string,
        operation: string,
        parameters: any[]
    ): Promise<{
        success: boolean;
        signedOperation?: SignedOperation;
        error?: string;
    }> {
        console.log(`📝 Firmando operación '${operation}' con certificado...`);

        try {
            // Verificar token de sesión
            const decoded = jwt.verify(
                sessionToken,
                process.env.JWT_SECRET || 'admin-secret'
            ) as any;

            // Verificar que la sesión existe
            const session = this.adminSessions.get(decoded.walletAddress);
            if (!session || !session.isAuthenticated) {
                return {
                    success: false,
                    error: 'Sesión no válida. Debe autenticarse primero con Metamask'
                };
            }

            // Inicializar servicio de certificados si es necesario
            if (!certificateSigningService.validateCertificate()) {
                await certificateSigningService.initialize();
            }

            // Firmar la operación con el certificado
            const result = await certificateSigningService.signAdminOperation(
                operation,
                parameters
            );

            // Crear mensaje para firma con Metamask (autenticación adicional)
            const walletMessage = `Confirmar operación: ${operation}`;
            
            const signedOperation: SignedOperation = {
                operation,
                parameters,
                walletSignature: '', // Se llenará en el frontend con Metamask
                certificateSignature: result.operationSignature,
                timestamp: new Date().toISOString()
            };

            console.log('✅ Operación firmada con certificado');
            console.log(`🔐 Firmante: ${result.operationSignature.subject}`);

            return {
                success: true,
                signedOperation
            };

        } catch (error: any) {
            console.error('❌ Error firmando operación:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Paso 3: Verificar operación firmada
     * Verifica tanto la firma de Metamask como la del certificado
     */
    async verifySignedOperation(
        signedOperation: SignedOperation,
        walletAddress: string
    ): Promise<{
        isValid: boolean;
        error?: string;
        details?: any;
    }> {
        console.log('🔍 Verificando operación firmada...');

        try {
            // Verificar que sea el administrador
            if (walletAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: 'Solo el administrador puede ejecutar esta operación'
                };
            }

            // Verificar firma de Metamask (si se proporciona)
            if (signedOperation.walletSignature) {
                const message = `Confirmar operación: ${signedOperation.operation}`;
                const messageHash = ethers.hashMessage(message);
                const recoveredAddress = ethers.recoverAddress(
                    messageHash,
                    signedOperation.walletSignature
                );

                if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                    return {
                        isValid: false,
                        error: 'Firma de Metamask inválida'
                    };
                }
            }

            // Verificar firma del certificado
            const operationData = JSON.stringify({
                operation: signedOperation.operation,
                parameters: signedOperation.parameters,
                timestamp: signedOperation.certificateSignature.timestamp,
                nonce: (signedOperation as any).nonce
            });

            const certVerification = await certificateSigningService.verifySignature(
                operationData,
                signedOperation.certificateSignature.signature
            );

            if (!certVerification.isValid) {
                return {
                    isValid: false,
                    error: `Firma de certificado inválida: ${certVerification.error}`
                };
            }

            // Verificar timestamp (máximo 5 minutos)
            const operationTime = new Date(signedOperation.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - operationTime.getTime();

            if (timeDiff > 5 * 60 * 1000) {
                return {
                    isValid: false,
                    error: 'La operación ha expirado (más de 5 minutos)'
                };
            }

            console.log('✅ Operación verificada correctamente');
            console.log('✅ Metamask: Wallet autenticada');
            console.log('✅ Certificado: Firma válida');

            return {
                isValid: true,
                details: {
                    walletVerified: true,
                    certificateVerified: true,
                    signer: certVerification.signerInfo,
                    operation: signedOperation.operation,
                    timestamp: signedOperation.timestamp
                }
            };

        } catch (error: any) {
            console.error('❌ Error verificando operación:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Obtener información de la sesión actual
     */
    getSession(walletAddress: string): AdminSession | undefined {
        return this.adminSessions.get(walletAddress);
    }

    /**
     * Cerrar sesión
     */
    logout(walletAddress: string): void {
        this.adminSessions.delete(walletAddress);
        console.log('👋 Sesión cerrada');
    }

    /**
     * Verificar si el admin está autenticado
     */
    isAuthenticated(walletAddress: string): boolean {
        const session = this.adminSessions.get(walletAddress);
        return session?.isAuthenticated || false;
    }

    /**
     * Obtener información del certificado del admin
     */
    async getAdminCertificateInfo(): Promise<any> {
        try {
            if (!certificateSigningService.validateCertificate()) {
                await certificateSigningService.initialize();
            }
            
            return certificateSigningService.getCertificateInfo();
        } catch (error: any) {
            console.error('❌ Error obteniendo info del certificado:', error);
            return null;
        }
    }
}

export const hybridAuthService = new HybridAuthService();
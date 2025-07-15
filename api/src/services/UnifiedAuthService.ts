/**
 * Servicio unificado de autenticación para todos los roles
 * Usa Metamask para identidad y certificados .pem para firmar operaciones
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import jwt from 'jsonwebtoken';

export interface UserIdentity {
    walletAddress: string;  // Identidad del usuario (desde Metamask)
    role: string;          // Rol del usuario
    certificatePath?: string;  // Path al certificado .pem del usuario
    organizationId: string;
    mspId: string;
}

export interface UserSession {
    identity: UserIdentity;
    sessionToken: string;
    isAuthenticated: boolean;
    certificateLoaded: boolean;
    loginTimestamp: string;
}

export interface SignedOperation {
    operation: string;
    parameters: any[];
    walletAddress: string;  // Identidad del firmante
    certificateSignature: string;  // Firma con certificado .pem
    algorithm: string;
    timestamp: string;
    nonce: string;
}

export class UnifiedAuthService {
    private userSessions: Map<string, UserSession> = new Map();
    private userCertificates: Map<string, forge.pki.Certificate> = new Map();
    private userPrivateKeys: Map<string, forge.pki.PrivateKey> = new Map();
    private fabricSamplesPath: string;

    constructor() {
        this.fabricSamplesPath = path.join(process.cwd(), '../fabric-samples/test-network');
    }

    /**
     * Autenticar usuario con Metamask (identidad)
     */
    async authenticateUser(
        walletAddress: string,
        signature: string,
        message: string,
        role: string
    ): Promise<{
        success: boolean;
        sessionToken?: string;
        error?: string;
    }> {
        console.log(`🦊 Autenticando usuario ${walletAddress} con rol ${role}...`);

        try {
            // Verificar firma de Metamask
            const messageHash = ethers.hashMessage(message);
            const recoveredAddress = ethers.recoverAddress(messageHash, signature);

            if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                return {
                    success: false,
                    error: 'Firma de Metamask inválida'
                };
            }

            // Determinar organización según rol
            const orgConfig = this.getOrganizationByRole(role);

            // Buscar certificado del usuario
            const certificatePath = await this.findUserCertificate(walletAddress, orgConfig.organizationId);
            
            if (!certificatePath) {
                console.log(`⚠️ Usuario ${walletAddress} no tiene certificado asignado`);
                // Podríamos permitir login pero sin capacidad de firmar
            }

            // Cargar certificado si existe
            let certificateLoaded = false;
            if (certificatePath) {
                certificateLoaded = await this.loadUserCertificate(walletAddress, certificatePath);
            }

            // Crear identidad del usuario
            const userIdentity: UserIdentity = {
                walletAddress,
                role,
                certificatePath,
                organizationId: orgConfig.organizationId,
                mspId: orgConfig.mspId
            };

            // Crear token de sesión
            const sessionToken = jwt.sign(
                {
                    walletAddress,
                    role,
                    organizationId: orgConfig.organizationId,
                    mspId: orgConfig.mspId,
                    timestamp: new Date().toISOString()
                },
                process.env.JWT_SECRET || 'unified-auth-secret',
                { expiresIn: '24h' }
            );

            // Guardar sesión
            const session: UserSession = {
                identity: userIdentity,
                sessionToken,
                isAuthenticated: true,
                certificateLoaded,
                loginTimestamp: new Date().toISOString()
            };

            this.userSessions.set(walletAddress, session);

            console.log(`✅ Usuario autenticado: ${walletAddress} (${role})`);
            if (certificateLoaded) {
                console.log('📜 Certificado cargado correctamente');
            } else {
                console.log('⚠️ Sin certificado, solo puede usar identidad');
            }

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
     * Firmar operación con certificado del usuario
     */
    async signOperationWithUserCertificate(
        walletAddress: string,
        operation: string,
        parameters: any[]
    ): Promise<{
        success: boolean;
        signedOperation?: SignedOperation;
        error?: string;
    }> {
        console.log(`📝 Firmando operación '${operation}' para usuario ${walletAddress}...`);

        try {
            // Verificar sesión
            const session = this.userSessions.get(walletAddress);
            if (!session || !session.isAuthenticated) {
                return {
                    success: false,
                    error: 'Usuario no autenticado'
                };
            }

            // Verificar que tenga certificado cargado
            if (!session.certificateLoaded) {
                return {
                    success: false,
                    error: 'Usuario no tiene certificado para firmar operaciones'
                };
            }

            // Obtener certificado y clave privada
            const certificate = this.userCertificates.get(walletAddress);
            const privateKey = this.userPrivateKeys.get(walletAddress);

            if (!certificate || !privateKey) {
                return {
                    success: false,
                    error: 'Certificado no disponible'
                };
            }

            // Crear datos de la operación
            const nonce = forge.util.bytesToHex(forge.random.getBytesSync(16));
            const operationData = {
                operation,
                parameters,
                walletAddress,
                role: session.identity.role,
                timestamp: new Date().toISOString(),
                nonce
            };

            // Crear hash y firmar
            const message = JSON.stringify(operationData);
            const md = forge.md.sha256.create();
            md.update(message, 'utf8');
            const signature = (privateKey as any).sign(md);
            const signatureBase64 = forge.util.encode64(signature);

            const signedOperation: SignedOperation = {
                operation,
                parameters,
                walletAddress,
                certificateSignature: signatureBase64,
                algorithm: 'SHA256withRSA',
                timestamp: operationData.timestamp,
                nonce
            };

            console.log(`✅ Operación firmada por ${walletAddress} (${session.identity.role})`);

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
     * Verificar operación firmada
     */
    async verifySignedOperation(
        signedOperation: SignedOperation,
        expectedWalletAddress?: string
    ): Promise<{
        isValid: boolean;
        signerInfo?: any;
        error?: string;
    }> {
        console.log('🔍 Verificando operación firmada...');

        try {
            // Si se espera una wallet específica, verificar
            if (expectedWalletAddress && 
                signedOperation.walletAddress.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: 'La operación no fue firmada por el usuario esperado'
                };
            }

            // Obtener certificado del firmante
            const certificate = this.userCertificates.get(signedOperation.walletAddress);
            if (!certificate) {
                // Intentar cargar certificado si no está en caché
                const session = this.userSessions.get(signedOperation.walletAddress);
                if (!session || !session.identity.certificatePath) {
                    return {
                        isValid: false,
                        error: 'Certificado del firmante no encontrado'
                    };
                }

                await this.loadUserCertificate(
                    signedOperation.walletAddress,
                    session.identity.certificatePath
                );
            }

            // Recrear mensaje original
            const operationData = {
                operation: signedOperation.operation,
                parameters: signedOperation.parameters,
                walletAddress: signedOperation.walletAddress,
                role: this.userSessions.get(signedOperation.walletAddress)?.identity.role,
                timestamp: signedOperation.timestamp,
                nonce: signedOperation.nonce
            };

            const message = JSON.stringify(operationData);
            const md = forge.md.sha256.create();
            md.update(message, 'utf8');

            // Verificar firma
            const signatureBytes = forge.util.decode64(signedOperation.certificateSignature);
            const publicKey = certificate!.publicKey as forge.pki.rsa.PublicKey;
            const isValid = publicKey.verify(md.digest().bytes(), signatureBytes);

            if (!isValid) {
                return {
                    isValid: false,
                    error: 'Firma inválida'
                };
            }

            // Verificar timestamp (máximo 5 minutos)
            const operationTime = new Date(signedOperation.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - operationTime.getTime();

            if (timeDiff > 5 * 60 * 1000) {
                return {
                    isValid: false,
                    error: 'Operación expirada (más de 5 minutos)'
                };
            }

            const subject = certificate!.subject;
            const issuer = certificate!.issuer;

            console.log('✅ Operación verificada correctamente');

            return {
                isValid: true,
                signerInfo: {
                    walletAddress: signedOperation.walletAddress,
                    commonName: subject.getField('CN')?.value || 'Unknown',
                    organization: subject.getField('O')?.value || 'Unknown',
                    issuer: issuer.getField('CN')?.value || 'Unknown',
                    role: this.userSessions.get(signedOperation.walletAddress)?.identity.role
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
     * Cargar certificado de usuario
     */
    private async loadUserCertificate(
        walletAddress: string,
        certificatePath: string
    ): Promise<boolean> {
        try {
            // Cargar certificado
            const certPem = fs.readFileSync(certificatePath, 'utf8');
            const certificate = forge.pki.certificateFromPem(certPem);

            // Buscar clave privada
            const keyPath = await this.findPrivateKey(path.dirname(certificatePath));
            if (!keyPath) {
                console.error('❌ Clave privada no encontrada');
                return false;
            }

            const keyPem = fs.readFileSync(keyPath, 'utf8');
            const privateKey = forge.pki.privateKeyFromPem(keyPem);

            // Guardar en caché
            this.userCertificates.set(walletAddress, certificate);
            this.userPrivateKeys.set(walletAddress, privateKey);

            console.log(`📜 Certificado cargado para ${walletAddress}`);
            return true;

        } catch (error: any) {
            console.error('❌ Error cargando certificado:', error);
            return false;
        }
    }

    /**
     * Buscar certificado de usuario
     */
    private async findUserCertificate(
        walletAddress: string,
        organizationId: string
    ): Promise<string | null> {
        try {
            const orgPath = path.join(
                this.fabricSamplesPath,
                'organizations/peerOrganizations',
                `${organizationId}.example.com/users`
            );

            if (!fs.existsSync(orgPath)) {
                return null;
            }

            // Buscar carpeta que contenga referencia a la wallet
            const users = fs.readdirSync(orgPath);
            for (const user of users) {
                // Buscar por dirección parcial en el nombre
                if (user.includes(walletAddress.slice(2, 8))) {
                    const certPath = path.join(orgPath, user, 'msp/signcerts/cert.pem');
                    if (fs.existsSync(certPath)) {
                        return certPath;
                    }
                }
            }

            return null;

        } catch (error) {
            console.error('❌ Error buscando certificado:', error);
            return null;
        }
    }

    /**
     * Buscar clave privada
     */
    private async findPrivateKey(certDir: string): Promise<string | null> {
        try {
            const keystorePath = path.join(certDir, '../keystore');
            if (!fs.existsSync(keystorePath)) {
                return null;
            }

            const files = fs.readdirSync(keystorePath);
            const keyFile = files.find(f => f.endsWith('_sk') || f.endsWith('.pem'));
            
            if (keyFile) {
                return path.join(keystorePath, keyFile);
            }

            return null;

        } catch (error) {
            console.error('❌ Error buscando clave privada:', error);
            return null;
        }
    }

    /**
     * Obtener organización por rol
     */
    private getOrganizationByRole(role: string): {
        organizationId: string;
        mspId: string;
    } {
        switch (role.toLowerCase()) {
            case 'admin':
            case 'producer':
                return { organizationId: 'org1', mspId: 'Org1MSP' };
            case 'factory':
            case 'retailer':
            case 'consumer':
                return { organizationId: 'org2', mspId: 'Org2MSP' };
            default:
                return { organizationId: 'org1', mspId: 'Org1MSP' };
        }
    }

    /**
     * Obtener sesión de usuario
     */
    getSession(walletAddress: string): UserSession | undefined {
        return this.userSessions.get(walletAddress);
    }

    /**
     * Cerrar sesión
     */
    logout(walletAddress: string): void {
        this.userSessions.delete(walletAddress);
        this.userCertificates.delete(walletAddress);
        this.userPrivateKeys.delete(walletAddress);
        console.log(`👋 Sesión cerrada para ${walletAddress}`);
    }
}

export const unifiedAuthService = new UnifiedAuthService();
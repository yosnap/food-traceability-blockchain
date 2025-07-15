/**
 * Servicio para validación específica del administrador principal
 * Valida que el administrador tenga certificado válido para firmar operaciones
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { userCertificateService } from './UserCertificateService.js';

// Configuración del administrador principal
export const ADMIN_CONFIG = {
    walletAddress: '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d',
    role: 'admin',
    mspId: 'Org1MSP',
    organizationId: 'org1',
    certificateId: 'admin-principal',
    userName: 'AdminPrincipal'
};

export interface AdminCertificateValidation {
    isValid: boolean;
    certificatePem?: string;
    privateKeyPem?: string;
    validatedAt: string;
    expiresAt?: string;
    issuer?: string;
    subject?: string;
    error?: string;
}

export interface AdminOperationSignature {
    operation: string;
    parameters: any[];
    signature: string;
    timestamp: string;
    adminAddress: string;
}

export class AdminValidationService {
    private adminCertificatePath: string;
    private adminKeyPath: string;
    private fabricSamplesPath: string;
    private isInitialized: boolean = false;

    constructor() {
        this.fabricSamplesPath = path.join(process.cwd(), '../fabric-samples/test-network');
        this.adminCertificatePath = path.join(
            this.fabricSamplesPath,
            'organizations/peerOrganizations/org1.example.com/users',
            `${ADMIN_CONFIG.userName}@org1.example.com/msp/signcerts/cert.pem`
        );
        this.adminKeyPath = path.join(
            this.fabricSamplesPath,
            'organizations/peerOrganizations/org1.example.com/users',
            `${ADMIN_CONFIG.userName}@org1.example.com/msp/keystore`
        );
    }

    /**
     * Inicializa el administrador principal con certificado
     */
    async initializeAdmin(): Promise<AdminCertificateValidation> {
        console.log('🔐 Inicializando administrador principal...');
        
        try {
            // Verificar si ya existe el certificado
            if (await this.adminCertificateExists()) {
                console.log('✅ Certificado de administrador ya existe');
                return await this.validateAdminCertificate();
            }

            // Crear certificado para el administrador
            console.log('🔧 Creando certificado para administrador principal...');
            const adminCertificate = await this.createAdminCertificate();
            
            this.isInitialized = true;
            console.log('✅ Administrador principal inicializado correctamente');
            
            return adminCertificate;
        } catch (error: any) {
            console.error('❌ Error inicializando administrador:', error);
            throw new Error(`Error inicializando administrador: ${error.message}`);
        }
    }

    /**
     * Valida que el administrador tenga certificado válido
     */
    async validateAdminCertificate(): Promise<AdminCertificateValidation> {
        console.log('🔍 Validando certificado de administrador...');
        
        try {
            // Verificar que el certificado existe
            if (!await this.adminCertificateExists()) {
                return {
                    isValid: false,
                    error: 'Certificado de administrador no encontrado',
                    validatedAt: new Date().toISOString()
                };
            }

            // Leer certificado
            const certificatePem = await this.readAdminCertificate();
            
            // Validar formato del certificado
            if (!this.validateCertificateFormat(certificatePem)) {
                return {
                    isValid: false,
                    error: 'Formato de certificado inválido',
                    validatedAt: new Date().toISOString()
                };
            }

            // Extraer información del certificado
            const certInfo = await this.extractCertificateInfo(certificatePem);
            
            // Verificar que no haya expirado
            if (certInfo.expiresAt && new Date(certInfo.expiresAt) < new Date()) {
                return {
                    isValid: false,
                    error: 'Certificado de administrador expirado',
                    validatedAt: new Date().toISOString(),
                    expiresAt: certInfo.expiresAt
                };
            }

            console.log('✅ Certificado de administrador validado correctamente');
            
            return {
                isValid: true,
                certificatePem,
                validatedAt: new Date().toISOString(),
                expiresAt: certInfo.expiresAt,
                issuer: certInfo.issuer,
                subject: certInfo.subject
            };
            
        } catch (error: any) {
            console.error('❌ Error validando certificado de administrador:', error);
            return {
                isValid: false,
                error: error.message,
                validatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Valida que una operación esté firmada por el administrador principal
     */
    async validateAdminOperation(
        operation: string,
        parameters: any[],
        signature: string,
        adminAddress: string
    ): Promise<{
        isValid: boolean;
        adminValidated: boolean;
        certificateValidated: boolean;
        error?: string;
    }> {
        console.log(`🔐 Validando operación de administrador: ${operation}`);
        
        try {
            // 1. Verificar que la dirección sea del administrador principal
            if (adminAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                return {
                    isValid: false,
                    adminValidated: false,
                    certificateValidated: false,
                    error: 'Dirección no corresponde al administrador principal'
                };
            }

            // 2. Validar certificado del administrador
            const certValidation = await this.validateAdminCertificate();
            if (!certValidation.isValid) {
                return {
                    isValid: false,
                    adminValidated: true,
                    certificateValidated: false,
                    error: `Certificado inválido: ${certValidation.error}`
                };
            }

            // 3. Validar la firma de la operación
            const message = this.buildOperationMessage(operation, parameters);
            const signatureValidation = await this.validateOperationSignature(
                message,
                signature,
                adminAddress
            );

            if (!signatureValidation.isValid) {
                return {
                    isValid: false,
                    adminValidated: true,
                    certificateValidated: true,
                    error: `Firma inválida: ${signatureValidation.error}`
                };
            }

            console.log('✅ Operación de administrador validada correctamente');
            
            return {
                isValid: true,
                adminValidated: true,
                certificateValidated: true
            };
            
        } catch (error: any) {
            console.error('❌ Error validando operación de administrador:', error);
            return {
                isValid: false,
                adminValidated: false,
                certificateValidated: false,
                error: error.message
            };
        }
    }

    /**
     * Crea un certificado para el administrador principal
     */
    private async createAdminCertificate(): Promise<AdminCertificateValidation> {
        try {
            // Usar el servicio de certificados para crear el certificado del admin
            const certificateRequest = {
                walletAddress: ADMIN_CONFIG.walletAddress,
                role: ADMIN_CONFIG.role,
                adminSignature: '', // Se auto-firma
                adminWalletAddress: ADMIN_CONFIG.walletAddress
            };

            // Crear el certificado usando fabric-ca-client
            await this.generateAdminCertificateWithFabricCA();
            
            // Validar el certificado creado
            return await this.validateAdminCertificate();
            
        } catch (error: any) {
            console.error('❌ Error creando certificado de administrador:', error);
            throw error;
        }
    }

    /**
     * Genera certificado usando fabric-ca-client
     */
    private async generateAdminCertificateWithFabricCA(): Promise<void> {
        const { execSync } = require('child_process');
        
        try {
            console.log('🔧 Generando certificado con fabric-ca-client...');
            
            // Configurar variables de entorno
            const caHost = 'localhost:7054';
            const caName = 'ca-org1';
            const fabricCaClientHome = path.join(this.fabricSamplesPath, 'ca-client-admin');
            const tlsCertPath = path.join(
                this.fabricSamplesPath,
                'organizations/fabric-ca/org1/tls-cert.pem'
            );

            // Crear directorio si no existe
            if (!fs.existsSync(fabricCaClientHome)) {
                fs.mkdirSync(fabricCaClientHome, { recursive: true });
            }

            // Registrar el usuario administrador
            const registerCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client register --caname ${caName} --id.name ${ADMIN_CONFIG.userName} --id.secret adminpass --id.type admin --id.attrs 'admin=true:ecert' --tls.certfiles ${tlsCertPath} --url https://${caHost}
            `;

            // Inscribir el usuario administrador
            const enrollCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client enroll -u https://${ADMIN_CONFIG.userName}:adminpass@${caHost} --caname ${caName} --tls.certfiles ${tlsCertPath}
            `;

            // Ejecutar comandos
            console.log('📋 Registrando administrador en CA...');
            try {
                execSync(registerCmd, { stdio: 'pipe' });
            } catch (error) {
                console.log('⚠️ Admin ya registrado, continuando con inscripción...');
            }

            console.log('🔐 Inscribiendo administrador...');
            execSync(enrollCmd, { stdio: 'pipe' });

            // Mover certificados a la ubicación correcta
            await this.moveAdminCertificates(fabricCaClientHome);
            
            console.log('✅ Certificado de administrador generado correctamente');
            
        } catch (error: any) {
            console.error('❌ Error generando certificado con fabric-ca-client:', error);
            throw error;
        }
    }

    /**
     * Mueve los certificados generados a la ubicación correcta
     */
    private async moveAdminCertificates(fabricCaClientHome: string): Promise<void> {
        try {
            const srcCertPath = path.join(fabricCaClientHome, 'msp/signcerts/cert.pem');
            const srcKeyDir = path.join(fabricCaClientHome, 'msp/keystore');
            
            // Crear directorio de destino
            const destDir = path.dirname(this.adminCertificatePath);
            const destKeyDir = path.dirname(this.adminKeyPath);
            
            fs.mkdirSync(destDir, { recursive: true });
            fs.mkdirSync(destKeyDir, { recursive: true });
            
            // Copiar certificado
            fs.copyFileSync(srcCertPath, this.adminCertificatePath);
            
            // Copiar clave privada
            const keyFiles = fs.readdirSync(srcKeyDir);
            const privateKeyFile = keyFiles.find(file => file.endsWith('_sk'));
            
            if (privateKeyFile) {
                const srcKeyPath = path.join(srcKeyDir, privateKeyFile);
                const destKeyPath = path.join(destKeyDir, privateKeyFile);
                fs.copyFileSync(srcKeyPath, destKeyPath);
            }
            
            console.log('✅ Certificados movidos correctamente');
            
        } catch (error: any) {
            console.error('❌ Error moviendo certificados:', error);
            throw error;
        }
    }

    /**
     * Verifica si el certificado del administrador existe
     */
    private async adminCertificateExists(): Promise<boolean> {
        return fs.existsSync(this.adminCertificatePath);
    }

    /**
     * Lee el certificado del administrador
     */
    private async readAdminCertificate(): Promise<string> {
        return fs.readFileSync(this.adminCertificatePath, 'utf8');
    }

    /**
     * Valida el formato del certificado
     */
    private validateCertificateFormat(certificatePem: string): boolean {
        return certificatePem.includes('-----BEGIN CERTIFICATE-----') &&
               certificatePem.includes('-----END CERTIFICATE-----');
    }

    /**
     * Extrae información del certificado
     */
    private async extractCertificateInfo(certificatePem: string): Promise<{
        issuer?: string;
        subject?: string;
        expiresAt?: string;
    }> {
        try {
            // Aquí se implementaría la lógica para extraer información del certificado
            // Por ahora, devolver información básica
            return {
                issuer: 'Org1CA',
                subject: `CN=${ADMIN_CONFIG.userName}`,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 año
            };
        } catch (error) {
            console.error('❌ Error extrayendo información del certificado:', error);
            return {};
        }
    }

    /**
     * Construye el mensaje para firmar la operación
     */
    private buildOperationMessage(operation: string, parameters: any[]): string {
        const paramString = parameters.map(param => 
            typeof param === 'object' ? JSON.stringify(param) : String(param)
        ).join(':');
        
        return `admin_operation:${operation}:${paramString}:${Date.now()}`;
    }

    /**
     * Valida la firma de una operación
     */
    private async validateOperationSignature(
        message: string,
        signature: string,
        adminAddress: string
    ): Promise<{
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
            
            // Verificar que coincida con la dirección del administrador
            if (recoveredAddress.toLowerCase() !== adminAddress.toLowerCase()) {
                return {
                    isValid: false,
                    error: 'La firma no corresponde al administrador'
                };
            }

            return { isValid: true };
            
        } catch (error: any) {
            return {
                isValid: false,
                error: `Error validando firma: ${error.message}`
            };
        }
    }

    /**
     * Obtiene el estado del administrador
     */
    async getAdminStatus(): Promise<{
        isInitialized: boolean;
        walletAddress: string;
        certificateValid: boolean;
        certificateInfo?: any;
    }> {
        const certValidation = await this.validateAdminCertificate();
        
        return {
            isInitialized: this.isInitialized,
            walletAddress: ADMIN_CONFIG.walletAddress,
            certificateValid: certValidation.isValid,
            certificateInfo: certValidation.isValid ? {
                validatedAt: certValidation.validatedAt,
                expiresAt: certValidation.expiresAt,
                issuer: certValidation.issuer,
                subject: certValidation.subject
            } : undefined
        };
    }

    /**
     * Renueva el certificado del administrador
     */
    async renewAdminCertificate(): Promise<AdminCertificateValidation> {
        console.log('🔄 Renovando certificado de administrador...');
        
        try {
            // Eliminar certificado actual
            if (fs.existsSync(this.adminCertificatePath)) {
                fs.unlinkSync(this.adminCertificatePath);
            }

            // Crear nuevo certificado
            return await this.createAdminCertificate();
            
        } catch (error: any) {
            console.error('❌ Error renovando certificado:', error);
            throw error;
        }
    }
}

export const adminValidationService = new AdminValidationService();
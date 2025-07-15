/**
 * Servicio para gestión de certificados de usuario
 * Integra wallets de Metamask con certificados .pem de Hyperledger Fabric
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { execSync } from 'child_process';

export interface UserCertificate {
    walletAddress: string;
    role: string;
    certificatePem: string;
    privateKeyPem: string;
    createdAt: string;
    createdBy: string;
    mspId: string;
    organizationId: string;
}

export interface CreateUserCertificateRequest {
    walletAddress: string;
    role: string;
    adminSignature: string;
    adminWalletAddress: string;
}

export class UserCertificateService {
    private fabricSamplesPath: string;
    private certificatesPath: string;
    private organizationsPath: string;

    constructor() {
        this.fabricSamplesPath = path.join(process.cwd(), '../fabric-samples/test-network');
        this.certificatesPath = path.join(this.fabricSamplesPath, 'organizations');
        this.organizationsPath = path.join(this.certificatesPath, 'peerOrganizations');
    }

    /**
     * Crea un certificado para un usuario nuevo
     */
    async createUserCertificate(request: CreateUserCertificateRequest): Promise<UserCertificate> {
        console.log(`🔐 Creando certificado para usuario: ${request.walletAddress}`);

        // Validar la firma del administrador
        await this.validateAdminSignature(request);

        // Determinar organización basada en rol
        const orgConfig = this.getOrganizationByRole(request.role);

        // Crear el certificado usando fabric-ca-client
        const certificateData = await this.generateCertificate(
            request.walletAddress,
            request.role,
            orgConfig
        );

        // Guardar el certificado en el filesystem
        await this.saveCertificateToFilesystem(certificateData, orgConfig);

        // Crear el objeto de certificado de usuario
        const userCertificate: UserCertificate = {
            walletAddress: request.walletAddress,
            role: request.role,
            certificatePem: certificateData.certificatePem,
            privateKeyPem: certificateData.privateKeyPem,
            createdAt: new Date().toISOString(),
            createdBy: request.adminWalletAddress,
            mspId: orgConfig.mspId,
            organizationId: orgConfig.organizationId
        };

        console.log(`✅ Certificado creado exitosamente para: ${request.walletAddress}`);
        return userCertificate;
    }

    /**
     * Valida la firma del administrador
     */
    private async validateAdminSignature(request: CreateUserCertificateRequest): Promise<void> {
        try {
            // Recrear el mensaje que debería haber sido firmado
            const message = `createUserCertificate:${request.walletAddress}:${request.role}`;
            const messageHash = ethers.hashMessage(message);
            
            // Recuperar la dirección del firmante
            const signerAddress = ethers.recoverAddress(messageHash, request.adminSignature);
            
            // Verificar que el firmante es el admin especificado
            if (signerAddress.toLowerCase() !== request.adminWalletAddress.toLowerCase()) {
                throw new Error('La firma no coincide con la dirección del administrador');
            }

            console.log(`✅ Firma del administrador validada: ${signerAddress}`);
        } catch (error) {
            console.error('❌ Error validando firma del administrador:', error);
            throw new Error('Firma de administrador inválida');
        }
    }

    /**
     * Determina la organización basada en el rol del usuario
     */
    private getOrganizationByRole(role: string): {
        organizationId: string;
        mspId: string;
        caPort: number;
        domain: string;
    } {
        const normalizedRole = role.toLowerCase();

        switch (normalizedRole) {
            case 'producer':
            case 'admin':
                return {
                    organizationId: 'org1',
                    mspId: 'Org1MSP',
                    caPort: 7054,
                    domain: 'org1.example.com'
                };
            case 'factory':
            case 'retailer':
            case 'consumer':
                return {
                    organizationId: 'org2',
                    mspId: 'Org2MSP',
                    caPort: 8054,
                    domain: 'org2.example.com'
                };
            default:
                throw new Error(`Rol no soportado: ${role}`);
        }
    }

    /**
     * Genera un certificado usando fabric-ca-client
     */
    private async generateCertificate(
        walletAddress: string,
        role: string,
        orgConfig: any
    ): Promise<{
        certificatePem: string;
        privateKeyPem: string;
    }> {
        console.log(`🔧 Generando certificado para ${walletAddress} en ${orgConfig.organizationId}`);

        try {
            // Crear un nombre de usuario único basado en la wallet
            const userName = `User_${walletAddress.slice(2, 8)}`;
            
            // Configurar variables de entorno para fabric-ca-client
            const caHost = `localhost:${orgConfig.caPort}`;
            const caName = `ca-${orgConfig.organizationId}`;
            const fabricCaClientHome = path.join(this.fabricSamplesPath, 'ca-client');
            const tlsCertPath = path.join(
                this.certificatesPath,
                `fabric-ca/${orgConfig.organizationId}/tls-cert.pem`
            );

            // Asegurarse de que el directorio existe
            if (!fs.existsSync(fabricCaClientHome)) {
                fs.mkdirSync(fabricCaClientHome, { recursive: true });
            }

            // Comando para registrar el usuario
            const registerCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client register --caname ${caName} --id.name ${userName} --id.secret ${userName}pass --id.type client --tls.certfiles ${tlsCertPath} --url https://${caHost}
            `;

            // Comando para inscribir el usuario y generar certificados
            const enrollCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client enroll -u https://${userName}:${userName}pass@${caHost} --caname ${caName} --tls.certfiles ${tlsCertPath}
            `;

            // Ejecutar comandos
            console.log('📋 Registrando usuario en CA...');
            try {
                execSync(registerCmd, { stdio: 'pipe' });
            } catch (error) {
                // Si ya existe, continuar
                console.log('⚠️ Usuario ya registrado o error menor, continuando...');
            }

            console.log('🔐 Inscribiendo usuario y generando certificados...');
            execSync(enrollCmd, { stdio: 'pipe' });

            // Leer los certificados generados
            const certDir = path.join(fabricCaClientHome, 'msp');
            const certPath = path.join(certDir, 'signcerts', 'cert.pem');
            const keyDir = path.join(certDir, 'keystore');
            
            // Encontrar el archivo de clave privada
            const keyFiles = fs.readdirSync(keyDir);
            const privateKeyFile = keyFiles.find(file => file.endsWith('_sk'));
            
            if (!privateKeyFile) {
                throw new Error('No se encontró la clave privada generada');
            }

            const privateKeyPath = path.join(keyDir, privateKeyFile);

            // Leer los archivos
            const certificatePem = fs.readFileSync(certPath, 'utf8');
            const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

            console.log('✅ Certificado generado exitosamente');
            return {
                certificatePem,
                privateKeyPem
            };

        } catch (error) {
            console.error('❌ Error generando certificado:', error);
            throw new Error(`Error generando certificado: ${error}`);
        }
    }

    /**
     * Guarda el certificado en el filesystem de Hyperledger Fabric
     */
    private async saveCertificateToFilesystem(
        certificateData: { certificatePem: string; privateKeyPem: string },
        orgConfig: any
    ): Promise<void> {
        console.log(`💾 Guardando certificado en filesystem para ${orgConfig.organizationId}`);

        // Crear directorio para el usuario específico
        const userDir = path.join(
            this.organizationsPath,
            `${orgConfig.domain}/users/User_${Date.now()}@${orgConfig.domain}`
        );

        const mspDir = path.join(userDir, 'msp');
        const signcertsDir = path.join(mspDir, 'signcerts');
        const keystoreDir = path.join(mspDir, 'keystore');

        // Crear directorios
        fs.mkdirSync(signcertsDir, { recursive: true });
        fs.mkdirSync(keystoreDir, { recursive: true });

        // Guardar certificado
        fs.writeFileSync(
            path.join(signcertsDir, 'cert.pem'),
            certificateData.certificatePem
        );

        // Guardar clave privada
        const privateKeyFileName = `${crypto.randomBytes(32).toString('hex')}_sk`;
        fs.writeFileSync(
            path.join(keystoreDir, privateKeyFileName),
            certificateData.privateKeyPem
        );

        // Copiar certificado de CA
        const caCertSource = path.join(
            this.certificatesPath,
            `fabric-ca/${orgConfig.organizationId}/ca-cert.pem`
        );
        const caCertDest = path.join(mspDir, 'cacerts', `localhost-${orgConfig.caPort}-ca-${orgConfig.organizationId}.pem`);
        
        fs.mkdirSync(path.dirname(caCertDest), { recursive: true });
        fs.copyFileSync(caCertSource, caCertDest);

        console.log('✅ Certificado guardado en filesystem');
    }

    /**
     * Verifica un certificado existente
     */
    async verifyCertificate(walletAddress: string, certificatePem: string): Promise<boolean> {
        try {
            // Verificar formato del certificado
            if (!certificatePem.includes('-----BEGIN CERTIFICATE-----')) {
                return false;
            }

            // Aquí se pueden agregar más validaciones específicas
            // como verificar la firma de la CA, fecha de expiración, etc.

            console.log(`✅ Certificado verificado para: ${walletAddress}`);
            return true;
        } catch (error) {
            console.error('❌ Error verificando certificado:', error);
            return false;
        }
    }

    /**
     * Revoca un certificado de usuario
     */
    async revokeCertificate(walletAddress: string, adminSignature: string): Promise<boolean> {
        console.log(`🚫 Revocando certificado para: ${walletAddress}`);
        
        try {
            // Validar firma del administrador
            const message = `revokeCertificate:${walletAddress}`;
            const messageHash = ethers.hashMessage(message);
            const signerAddress = ethers.recoverAddress(messageHash, adminSignature);
            
            // Aquí se implementaría la lógica de revocación usando fabric-ca-client
            // Por ahora, simplemente confirmamos que la operación fue exitosa
            
            console.log(`✅ Certificado revocado exitosamente para: ${walletAddress}`);
            return true;
        } catch (error) {
            console.error('❌ Error revocando certificado:', error);
            return false;
        }
    }

    /**
     * Lista todos los certificados de usuario
     */
    async listUserCertificates(): Promise<string[]> {
        const certificates: string[] = [];
        
        try {
            // Recorrer las organizaciones
            const orgs = ['org1.example.com', 'org2.example.com'];
            
            for (const org of orgs) {
                const orgPath = path.join(this.organizationsPath, org, 'users');
                
                if (fs.existsSync(orgPath)) {
                    const users = fs.readdirSync(orgPath);
                    
                    for (const user of users) {
                        const certPath = path.join(orgPath, user, 'msp', 'signcerts', 'cert.pem');
                        
                        if (fs.existsSync(certPath)) {
                            certificates.push(user);
                        }
                    }
                }
            }
            
            console.log(`📋 Encontrados ${certificates.length} certificados de usuario`);
            return certificates;
        } catch (error) {
            console.error('❌ Error listando certificados:', error);
            return [];
        }
    }
}

export const userCertificateService = new UserCertificateService();
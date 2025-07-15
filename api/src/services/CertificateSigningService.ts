/**
 * Servicio para firmar y verificar operaciones usando certificados .pem
 * Usa criptografía X.509 para autenticación del administrador
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

export interface CertificateSignature {
    signature: string;
    algorithm: string;
    certificateSerialNumber: string;
    issuer: string;
    subject: string;
    timestamp: string;
}

export interface VerificationResult {
    isValid: boolean;
    signerInfo?: {
        commonName: string;
        organization: string;
        serialNumber: string;
        issuer: string;
    };
    error?: string;
}

export class CertificateSigningService {
    private adminCertPath: string;
    private adminKeyPath: string;
    private adminCertificate: forge.pki.Certificate | null = null;
    private adminPrivateKey: forge.pki.PrivateKey | null = null;
    private fabricSamplesPath: string;

    constructor() {
        this.fabricSamplesPath = path.join(process.cwd(), '../fabric-samples/test-network');
        this.adminCertPath = path.join(
            this.fabricSamplesPath,
            'organizations/peerOrganizations/org1.example.com/users',
            'AdminPrincipal@org1.example.com/msp/signcerts/cert.pem'
        );
        this.adminKeyPath = path.join(
            this.fabricSamplesPath,
            'organizations/peerOrganizations/org1.example.com/users',
            'AdminPrincipal@org1.example.com/msp/keystore'
        );
    }

    /**
     * Inicializa el servicio cargando certificado y clave privada
     */
    async initialize(): Promise<void> {
        console.log('🔐 Inicializando servicio de firma con certificados...');
        
        try {
            // Cargar certificado
            const certPem = fs.readFileSync(this.adminCertPath, 'utf8');
            this.adminCertificate = forge.pki.certificateFromPem(certPem);
            
            // Cargar clave privada
            const keyPath = await this.findPrivateKey();
            if (!keyPath) {
                throw new Error('Clave privada del administrador no encontrada');
            }
            
            const keyPem = fs.readFileSync(keyPath, 'utf8');
            this.adminPrivateKey = forge.pki.privateKeyFromPem(keyPem);
            
            console.log('✅ Servicio de firma inicializado correctamente');
            console.log(`📜 Certificado cargado: ${this.adminCertificate.subject.getField('CN').value}`);
            
        } catch (error: any) {
            console.error('❌ Error inicializando servicio de firma:', error);
            throw new Error(`Error inicializando servicio de firma: ${error.message}`);
        }
    }

    /**
     * Firma un mensaje usando el certificado del administrador
     */
    async signMessage(message: string): Promise<CertificateSignature> {
        console.log('✍️  Firmando mensaje con certificado del administrador...');
        
        if (!this.adminCertificate || !this.adminPrivateKey) {
            throw new Error('Servicio no inicializado. Ejecute initialize() primero');
        }

        try {
            // Crear hash del mensaje
            const md = forge.md.sha256.create();
            md.update(message, 'utf8');
            
            // Firmar con la clave privada usando node-forge
            const signature = (this.adminPrivateKey as any).sign(md);
            
            // Convertir a base64
            const signatureBase64 = forge.util.encode64(signature);
            
            // Obtener información del certificado
            const subject = this.adminCertificate.subject;
            const issuer = this.adminCertificate.issuer;
            
            const certificateSignature: CertificateSignature = {
                signature: signatureBase64,
                algorithm: 'SHA256withRSA',
                certificateSerialNumber: this.adminCertificate.serialNumber,
                issuer: issuer.getField('CN').value,
                subject: subject.getField('CN').value,
                timestamp: new Date().toISOString()
            };
            
            console.log('✅ Mensaje firmado correctamente');
            console.log(`📋 Firmado por: ${certificateSignature.subject}`);
            
            return certificateSignature;
            
        } catch (error: any) {
            console.error('❌ Error firmando mensaje:', error);
            throw new Error(`Error firmando mensaje: ${error.message}`);
        }
    }

    /**
     * Verifica una firma usando el certificado
     */
    async verifySignature(
        message: string, 
        signature: string,
        certificatePem?: string
    ): Promise<VerificationResult> {
        console.log('🔍 Verificando firma con certificado...');
        
        try {
            // Usar certificado proporcionado o el del administrador
            let certificate: forge.pki.Certificate;
            
            if (certificatePem) {
                certificate = forge.pki.certificateFromPem(certificatePem);
            } else if (this.adminCertificate) {
                certificate = this.adminCertificate;
            } else {
                throw new Error('No hay certificado disponible para verificar');
            }
            
            // Crear hash del mensaje
            const md = forge.md.sha256.create();
            md.update(message, 'utf8');
            
            // Decodificar firma de base64
            const signatureBytes = forge.util.decode64(signature);
            
            // Verificar firma con la clave pública del certificado
            const publicKey = certificate.publicKey as forge.pki.rsa.PublicKey;
            const isValid = publicKey.verify(md.digest().bytes(), signatureBytes);
            
            if (isValid) {
                const subject = certificate.subject;
                const issuer = certificate.issuer;
                
                console.log('✅ Firma verificada correctamente');
                
                return {
                    isValid: true,
                    signerInfo: {
                        commonName: subject.getField('CN').value,
                        organization: subject.getField('O')?.value || 'N/A',
                        serialNumber: certificate.serialNumber,
                        issuer: issuer.getField('CN').value
                    }
                };
            } else {
                console.log('❌ Firma inválida');
                
                return {
                    isValid: false,
                    error: 'La firma no coincide con el certificado'
                };
            }
            
        } catch (error: any) {
            console.error('❌ Error verificando firma:', error);
            return {
                isValid: false,
                error: `Error verificando firma: ${error.message}`
            };
        }
    }

    /**
     * Firma una operación administrativa
     */
    async signAdminOperation(operation: string, parameters: any[]): Promise<{
        operationSignature: CertificateSignature;
        operationData: string;
    }> {
        console.log(`🔐 Firmando operación administrativa: ${operation}`);
        
        // Construir datos de la operación
        const operationData = JSON.stringify({
            operation,
            parameters,
            timestamp: new Date().toISOString(),
            nonce: crypto.randomBytes(16).toString('hex')
        });
        
        // Firmar los datos
        const signature = await this.signMessage(operationData);
        
        return {
            operationSignature: signature,
            operationData
        };
    }

    /**
     * Verifica una operación administrativa
     */
    async verifyAdminOperation(
        operationData: string,
        signature: string,
        expectedOperation?: string
    ): Promise<VerificationResult> {
        console.log('🔍 Verificando operación administrativa...');
        
        try {
            // Verificar la firma
            const verificationResult = await this.verifySignature(operationData, signature);
            
            if (!verificationResult.isValid) {
                return verificationResult;
            }
            
            // Parsear datos de la operación
            const operation = JSON.parse(operationData);
            
            // Verificar que la operación sea la esperada
            if (expectedOperation && operation.operation !== expectedOperation) {
                return {
                    isValid: false,
                    error: `Operación esperada: ${expectedOperation}, recibida: ${operation.operation}`
                };
            }
            
            // Verificar timestamp (no más de 5 minutos de antigüedad)
            const operationTime = new Date(operation.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - operationTime.getTime();
            
            if (timeDiff > 5 * 60 * 1000) { // 5 minutos
                return {
                    isValid: false,
                    error: 'La operación ha expirado (más de 5 minutos)'
                };
            }
            
            console.log('✅ Operación verificada correctamente');
            
            return verificationResult;
            
        } catch (error: any) {
            console.error('❌ Error verificando operación:', error);
            return {
                isValid: false,
                error: `Error verificando operación: ${error.message}`
            };
        }
    }

    /**
     * Encuentra la clave privada en el keystore
     */
    private async findPrivateKey(): Promise<string | null> {
        try {
            const files = fs.readdirSync(this.adminKeyPath);
            const privateKeyFile = files.find(file => 
                file.endsWith('_sk') || file.endsWith('.pem')
            );
            
            if (privateKeyFile) {
                return path.join(this.adminKeyPath, privateKeyFile);
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error buscando clave privada:', error);
            return null;
        }
    }

    /**
     * Obtiene información del certificado del administrador
     */
    getCertificateInfo(): any {
        if (!this.adminCertificate) {
            throw new Error('Certificado no cargado');
        }
        
        const subject = this.adminCertificate.subject;
        const issuer = this.adminCertificate.issuer;
        
        return {
            subject: {
                commonName: subject.getField('CN').value,
                organization: subject.getField('O')?.value,
                organizationalUnit: subject.getField('OU')?.value,
                country: subject.getField('C')?.value
            },
            issuer: {
                commonName: issuer.getField('CN').value,
                organization: issuer.getField('O')?.value,
                organizationalUnit: issuer.getField('OU')?.value,
                country: issuer.getField('C')?.value
            },
            serialNumber: this.adminCertificate.serialNumber,
            validity: {
                notBefore: this.adminCertificate.validity.notBefore,
                notAfter: this.adminCertificate.validity.notAfter
            },
            fingerprint: forge.md.sha256.create()
                .update(forge.asn1.toDer(forge.pki.certificateToAsn1(this.adminCertificate)).getBytes())
                .digest().toHex()
        };
    }

    /**
     * Valida que el certificado esté vigente
     */
    validateCertificate(): boolean {
        if (!this.adminCertificate) {
            return false;
        }
        
        const now = new Date();
        const notBefore = this.adminCertificate.validity.notBefore;
        const notAfter = this.adminCertificate.validity.notAfter;
        
        return now >= notBefore && now <= notAfter;
    }

    /**
     * Genera un certificado de sesión temporal
     */
    async generateSessionCertificate(
        sessionId: string,
        validityHours: number = 24
    ): Promise<{
        certificate: string;
        privateKey: string;
    }> {
        console.log('🔐 Generando certificado de sesión...');
        
        try {
            // Generar par de claves
            const keys = forge.pki.rsa.generateKeyPair(2048);
            
            // Crear certificado
            const cert = forge.pki.createCertificate();
            cert.publicKey = keys.publicKey;
            cert.serialNumber = Date.now().toString();
            cert.validity.notBefore = new Date();
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setHours(cert.validity.notBefore.getHours() + validityHours);
            
            // Establecer subject
            const attrs = [{
                name: 'commonName',
                value: `Session-${sessionId}`
            }, {
                name: 'organizationName',
                value: 'Food Traceability System'
            }, {
                shortName: 'OU',
                value: 'Admin Sessions'
            }];
            
            cert.setSubject(attrs);
            cert.setIssuer(this.adminCertificate!.subject.attributes);
            
            // Firmar con el certificado del administrador
            cert.sign(this.adminPrivateKey! as any, forge.md.sha256.create());
            
            // Convertir a PEM
            const certPem = forge.pki.certificateToPem(cert);
            const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
            
            console.log('✅ Certificado de sesión generado');
            
            return {
                certificate: certPem,
                privateKey: keyPem
            };
            
        } catch (error: any) {
            console.error('❌ Error generando certificado de sesión:', error);
            throw error;
        }
    }
}

export const certificateSigningService = new CertificateSigningService();
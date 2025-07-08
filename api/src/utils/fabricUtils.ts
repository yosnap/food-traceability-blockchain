/**
 * Utilidades para manejo dinámico de certificados y conexiones Fabric
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface OrganizationConfig {
    mspId: string;
    orgName: string;
    peerEndpoint: string;
    caEndpoint: string;
    tlsCertPath: string;
}

export interface UserCertificateInfo {
    userId: string;
    role: string;
    organization: string;
    certPath: string;
    keyPath: string;
    isValid: boolean;
    expirationDate?: Date;
}

/**
 * Configuraciones de organizaciones disponibles
 */
export const FABRIC_ORGANIZATIONS: Record<string, OrganizationConfig> = {
    'org1': {
        mspId: 'Org1MSP',
        orgName: 'org1.example.com',
        peerEndpoint: 'localhost:7051',
        caEndpoint: 'localhost:7054',
        tlsCertPath: 'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
    },
    'org2': {
        mspId: 'Org2MSP', 
        orgName: 'org2.example.com',
        peerEndpoint: 'localhost:9051',
        caEndpoint: 'localhost:8054',
        tlsCertPath: 'organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt'
    }
};

/**
 * Mapeo de roles a organizaciones (para desarrollo)
 */
export const ROLE_TO_ORGANIZATION: Record<string, string> = {
    'admin': 'org1',
    'producer': 'org1',
    'processor': 'org2',
    'distributor': 'org2',
    'retailer': 'org2',
    'consumer': 'org2'
};

/**
 * Obtiene la configuración de una organización
 */
export function getOrganizationConfig(orgId: string): OrganizationConfig {
    const config = FABRIC_ORGANIZATIONS[orgId];
    if (!config) {
        throw new Error(`Organización ${orgId} no encontrada`);
    }
    return config;
}

/**
 * Obtiene la organización apropiada para un rol
 */
export function getOrganizationForRole(role: string): string {
    return ROLE_TO_ORGANIZATION[role] || 'org1';
}

/**
 * Verifica si existe un certificado para un usuario
 */
export async function checkUserCertificate(
    networkPath: string,
    userId: string,
    role: string
): Promise<UserCertificateInfo> {
    const orgId = getOrganizationForRole(role);
    const orgConfig = getOrganizationConfig(orgId);
    
    // Para desarrollo, mapear userId a usuarios existentes
    const fabricUserId = mapToFabricUser(userId, role);
    
    const userPath = path.join(
        networkPath,
        'organizations/peerOrganizations',
        orgConfig.orgName,
        'users',
        fabricUserId,
        'msp'
    );

    const certPath = path.join(userPath, 'signcerts/cert.pem');
    const keystorePath = path.join(userPath, 'keystore');

    const info: UserCertificateInfo = {
        userId,
        role,
        organization: orgId,
        certPath,
        keyPath: keystorePath,
        isValid: false
    };

    try {
        // Verificar si existe el certificado
        if (!await pathExists(certPath)) {
            console.log(`⚠️  Certificado no encontrado: ${certPath}`);
            return info;
        }

        // Verificar si existe el keystore
        if (!await pathExists(keystorePath)) {
            console.log(`⚠️  Keystore no encontrado: ${keystorePath}`);
            return info;
        }

        // Verificar que hay archivos de clave en keystore
        const keystoreFiles = await fs.promises.readdir(keystorePath);
        const hasPrivateKey = keystoreFiles.some(file => file.endsWith('_sk') || file.endsWith('.pem'));
        
        if (!hasPrivateKey) {
            console.log(`⚠️  Clave privada no encontrada en: ${keystorePath}`);
            return info;
        }

        // Validar certificado
        const certContent = await fs.promises.readFile(certPath, 'utf8');
        const certInfo = parseCertificate(certContent);
        
        info.isValid = true;
        info.expirationDate = certInfo.expirationDate;

        console.log(`✅ Certificado válido para ${userId} (${role}) en ${orgId}`);
        return info;

    } catch (error: any) {
        console.error(`❌ Error verificando certificado para ${userId}:`, error.message);
        return info;
    }
}

/**
 * Mapea un userId de aplicación a un usuario de Fabric existente
 */
export function mapToFabricUser(userId: string, role: string): string {
    // Para desarrollo, usar usuarios pre-existentes en test-network
    if (role === 'admin') {
        return 'Admin@org1.example.com';
    }
    
    const orgId = getOrganizationForRole(role);
    return `User1@${FABRIC_ORGANIZATIONS[orgId].orgName}`;
}

/**
 * Parsea un certificado X.509 para extraer información
 */
export function parseCertificate(certPem: string): {
    subject: string;
    issuer: string;
    serialNumber: string;
    expirationDate: Date;
    isExpired: boolean;
} {
    try {
        // Crear objeto certificado
        const cert = new crypto.X509Certificate(certPem);
        
        const expirationDate = new Date(cert.validTo);
        const isExpired = expirationDate < new Date();

        return {
            subject: cert.subject,
            issuer: cert.issuer,
            serialNumber: cert.serialNumber,
            expirationDate,
            isExpired
        };
    } catch (error: any) {
        throw new Error(`Error parseando certificado: ${error.message}`);
    }
}

/**
 * Obtiene la ruta completa de un archivo de red
 */
export function getNetworkFilePath(networkPath: string, relativePath: string): string {
    return path.resolve(networkPath, relativePath);
}

/**
 * Verifica si una ruta existe
 */
export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Lee un archivo de clave privada del keystore
 */
export async function readPrivateKey(keystorePath: string): Promise<Buffer> {
    const files = await fs.promises.readdir(keystorePath);
    
    // Buscar archivo de clave privada
    const keyFile = files.find(file => file.endsWith('_sk') || file.endsWith('.pem'));
    
    if (!keyFile) {
        throw new Error(`No se encontró clave privada en ${keystorePath}`);
    }

    const keyPath = path.join(keystorePath, keyFile);
    return await fs.promises.readFile(keyPath);
}

/**
 * Valida que todos los archivos necesarios existan para una organización
 */
export async function validateOrganizationFiles(
    networkPath: string,
    orgId: string
): Promise<{
    isValid: boolean;
    missingFiles: string[];
    errors: string[];
}> {
    const orgConfig = getOrganizationConfig(orgId);
    const missingFiles: string[] = [];
    const errors: string[] = [];

    // Verificar certificado TLS del peer
    const tlsCertPath = getNetworkFilePath(networkPath, orgConfig.tlsCertPath);
    if (!await pathExists(tlsCertPath)) {
        missingFiles.push(orgConfig.tlsCertPath);
    }

    // Verificar usuarios por defecto
    const adminUserPath = path.join(
        networkPath,
        'organizations/peerOrganizations',
        orgConfig.orgName,
        'users/Admin@' + orgConfig.orgName
    );
    
    const regularUserPath = path.join(
        networkPath,
        'organizations/peerOrganizations', 
        orgConfig.orgName,
        'users/User1@' + orgConfig.orgName
    );

    if (!await pathExists(adminUserPath)) {
        missingFiles.push(`users/Admin@${orgConfig.orgName}`);
    }

    if (!await pathExists(regularUserPath)) {
        missingFiles.push(`users/User1@${orgConfig.orgName}`);
    }

    return {
        isValid: missingFiles.length === 0,
        missingFiles,
        errors
    };
}

/**
 * Obtiene estadísticas de certificados en la red
 */
export async function getCertificateStats(networkPath: string): Promise<{
    organizations: number;
    totalUsers: number;
    validCertificates: number;
    expiredCertificates: number;
    organizationStats: Record<string, any>;
}> {
    const stats = {
        organizations: 0,
        totalUsers: 0,
        validCertificates: 0,
        expiredCertificates: 0,
        organizationStats: {} as Record<string, any>
    };

    for (const [orgId, orgConfig] of Object.entries(FABRIC_ORGANIZATIONS)) {
        const orgValidation = await validateOrganizationFiles(networkPath, orgId);
        
        stats.organizations++;
        stats.organizationStats[orgId] = {
            name: orgConfig.orgName,
            mspId: orgConfig.mspId,
            isValid: orgValidation.isValid,
            missingFiles: orgValidation.missingFiles.length
        };

        // Contar usuarios (simplificado para desarrollo)
        if (orgValidation.isValid) {
            stats.totalUsers += 2; // Admin + User1
            stats.validCertificates += 2;
        }
    }

    return stats;
}

/**
 * Utlidad para logging de información de certificados
 */
export function logCertificateInfo(info: UserCertificateInfo): void {
    const status = info.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
    const expiry = info.expirationDate ? ` (Expira: ${info.expirationDate.toISOString()})` : '';
    
    console.log(`📋 [${info.organization.toUpperCase()}] ${info.userId} (${info.role}): ${status}${expiry}`);
}

export default {
    getOrganizationConfig,
    getOrganizationForRole,
    checkUserCertificate,
    mapToFabricUser,
    parseCertificate,
    validateOrganizationFiles,
    getCertificateStats,
    pathExists,
    readPrivateKey,
    logCertificateInfo
};
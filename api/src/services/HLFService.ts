/**
 * Servicio HLF basado en el repositorio de referencia
 * Implementa autenticación con certificados X.509 siguiendo el patrón exacto de hlf.js
 */

import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers, Gateway, Network } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Configuración basada en el repositorio de referencia
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'mychannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'food-traceability';
const MSPID = process.env.MSPID || 'Org1MSP';
const PEER_ENDPOINT = process.env.PEER_ENDPOINT || 'localhost:7051';
const PEER_HOST_ALIAS = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';

// Paths de certificados - siguiendo estructura del repositorio de referencia
const FABRIC_NETWORK_PATH = process.env.FABRIC_NETWORK_PATH || path.resolve(process.cwd(), '../fabric-samples/test-network');

// Función para cargar certificado de usuario
function loadUserCertificate(userId: string, orgName: string): Buffer {
    const certPath = path.join(
        FABRIC_NETWORK_PATH,
        'organizations/peerOrganizations',
        `${orgName}.example.com`,
        'users',
        `${userId}@${orgName}.example.com`,
        'msp/signcerts/cert.pem'
    );
    
    console.log(`📜 Cargando certificado desde: ${certPath}`);
    return fs.readFileSync(certPath);
}

// Función para cargar clave privada de usuario
function loadUserPrivateKey(userId: string, orgName: string): Buffer {
    const keystorePath = path.join(
        FABRIC_NETWORK_PATH,
        'organizations/peerOrganizations',
        `${orgName}.example.com`,
        'users',
        `${userId}@${orgName}.example.com`,
        'msp/keystore'
    );
    
    console.log(`🔑 Buscando clave privada en: ${keystorePath}`);
    
    // Leer archivos del keystore
    const keystoreFiles = fs.readdirSync(keystorePath);
    const keyFile = keystoreFiles.find(file => file.endsWith('_sk') || file.endsWith('.pem'));
    
    if (!keyFile) {
        throw new Error(`No se encontró clave privada en ${keystorePath}`);
    }
    
    const keyPath = path.join(keystorePath, keyFile);
    console.log(`🔑 Cargando clave privada desde: ${keyPath}`);
    return fs.readFileSync(keyPath);
}

// Función para cargar certificado TLS del peer
function loadTLSCertificate(): Buffer {
    const tlsCertPath = path.join(
        FABRIC_NETWORK_PATH,
        'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
    );
    
    console.log(`🔒 Cargando certificado TLS desde: ${tlsCertPath}`);
    return fs.readFileSync(tlsCertPath);
}

// Mapeo de roles a organizaciones (siguiendo el patrón del repositorio de referencia)
function getRoleOrganization(role: string): { orgName: string; mspId: string } {
    switch (role.toLowerCase()) {
        case 'producer':
        case 'admin':
            return { orgName: 'org1', mspId: 'Org1MSP' };
        case 'factory':
        case 'processor':
            return { orgName: 'org2', mspId: 'Org2MSP' };
        case 'retailer':
        case 'distributor':
            return { orgName: 'org1', mspId: 'Org1MSP' }; // Ajustar según tu red
        case 'consumer':
            return { orgName: 'org2', mspId: 'Org2MSP' }; // Ajustar según tu red
        default:
            return { orgName: 'org1', mspId: 'Org1MSP' };
    }
}

// Clase principal del servicio HLF
export class HLFService {
    private client: grpc.Client | null = null;
    private isInitialized: boolean = false;

    constructor() {
        console.log('🔧 Inicializando HLFService con autenticación X.509...');
    }

    /**
     * Conecta a Fabric usando certificados X.509 de un usuario específico
     * Siguiendo exactamente el patrón del repositorio de referencia
     */
    async connectFabric(userId: string, role: string): Promise<{ gateway: Gateway; contract: Contract }> {
        try {
            console.log(`🔗 Conectando a Fabric como ${userId} con rol ${role}...`);

            // 1. Obtener organización basada en el rol
            const { orgName, mspId } = getRoleOrganization(role);
            console.log(`🏢 Organización: ${orgName}, MSP: ${mspId}`);

            // 2. Crear cliente gRPC si no existe
            if (!this.client) {
                const tlsCert = loadTLSCertificate();
                const tlsCredentials = grpc.credentials.createSsl(tlsCert);

                this.client = new grpc.Client(PEER_ENDPOINT, tlsCredentials, {
                    'grpc.ssl_target_name_override': PEER_HOST_ALIAS,
                });
                console.log(`📡 Cliente gRPC creado para ${PEER_ENDPOINT}`);
            }

            // 3. Cargar certificado y clave privada del usuario
            const CERT_USER = loadUserCertificate(userId, orgName);
            const KEY_USER = loadUserPrivateKey(userId, orgName);

            // 4. Crear identidad (siguiendo patrón del repositorio de referencia)
            const identity: Identity = {
                mspId: mspId,
                credentials: CERT_USER // Buffer del certificado X.509
            };

            // 5. Crear signer con la clave privada
            const privateKey = crypto.createPrivateKey(KEY_USER);
            const signer: Signer = signers.newPrivateKeySigner(privateKey);

            // 6. Conectar al gateway (patrón exacto del repositorio de referencia)
            const gateway = connect({
                client: this.client,
                identity,
                signer,
                evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
                endorseOptions: () => ({ deadline: Date.now() + 15000 }),
                submitOptions: () => ({ deadline: Date.now() + 5000 }),
                commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
            });

            // 7. Obtener network y contract
            const network: Network = gateway.getNetwork(CHANNEL_NAME);
            const contract: Contract = network.getContract(CHAINCODE_NAME);

            console.log(`✅ Conectado exitosamente como ${userId}@${orgName}.example.com`);
            this.isInitialized = true;

            return { gateway, contract };

        } catch (error: any) {
            console.error(`❌ Error conectando como ${userId}:`, error.message);
            throw new Error(`Error de autenticación X.509: ${error.message}`);
        }
    }

    /**
     * Ejecuta una transacción en el chaincode (con soporte para contratos específicos)
     */
    async submitTransaction(
        userId: string,
        role: string,
        functionName: string,
        ...args: string[]
    ): Promise<string> {
        const { gateway, contract } = await this.connectFabric(userId, role);

        try {
            console.log(`📤 Ejecutando transacción: ${functionName} como ${userId}`);
            
            let result;
            
            // Si la función incluye un nombre de contrato específico (ej: "UserContractReference:createUser")
            if (functionName.includes(':')) {
                const [contractName, methodName] = functionName.split(':');
                console.log(`🔗 Usando contrato específico: ${contractName}.${methodName}`);
                
                const network = gateway.getNetwork(CHANNEL_NAME);
                const specificContract = network.getContract(CHAINCODE_NAME, contractName);
                result = await specificContract.submitTransaction(methodName, ...args);
            } else {
                // Usar el contrato principal
                result = await contract.submitTransaction(functionName, ...args);
            }
            
            const response = new TextDecoder().decode(result);
            console.log(`✅ Transacción ${functionName} completada`);
            return response;

        } catch (error: any) {
            console.error(`❌ Error en transacción ${functionName}:`, error.message);
            throw error;
        } finally {
            // Cerrar gateway después de la transacción
            gateway.close();
        }
    }

    /**
     * Ejecuta una consulta en el chaincode (con soporte para contratos específicos)
     */
    async evaluateTransaction(
        userId: string,
        role: string,
        functionName: string,
        ...args: string[]
    ): Promise<string> {
        const { gateway, contract } = await this.connectFabric(userId, role);

        try {
            console.log(`🔍 Ejecutando consulta: ${functionName} como ${userId}`);
            
            let result;
            
            // Si la función incluye un nombre de contrato específico
            if (functionName.includes(':')) {
                const [contractName, methodName] = functionName.split(':');
                console.log(`🔗 Usando contrato específico: ${contractName}.${methodName}`);
                
                const network = gateway.getNetwork(CHANNEL_NAME);
                const specificContract = network.getContract(CHAINCODE_NAME, contractName);
                result = await specificContract.evaluateTransaction(methodName, ...args);
            } else {
                // Usar el contrato principal
                result = await contract.evaluateTransaction(functionName, ...args);
            }
            
            const response = new TextDecoder().decode(result);
            console.log(`✅ Consulta ${functionName} completada`);
            return response;

        } catch (error: any) {
            console.error(`❌ Error en consulta ${functionName}:`, error.message);
            throw error;
        } finally {
            // Cerrar gateway después de la consulta
            gateway.close();
        }
    }

    /**
     * Ping al chaincode con autenticación X.509
     */
    async ping(userId: string = 'Admin', role: string = 'admin'): Promise<string> {
        return await this.evaluateTransaction(userId, role, 'ping');
    }

    /**
     * Verifica si el servicio está inicializado
     */
    isConnected(): boolean {
        return this.isInitialized && this.client !== null;
    }

    /**
     * Cierra las conexiones
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        this.isInitialized = false;
        console.log('📡 HLFService desconectado');
    }
}

// Exportar instancia singleton
export const hlfService = new HLFService();
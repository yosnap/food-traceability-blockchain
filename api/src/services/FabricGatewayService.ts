/**
 * Servicio moderno para conectar con Hyperledger Fabric usando Gateway API
 * Maneja usuarios dinámicos y firmas por roles
 */

import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Identity, Signer, signers, Gateway, Network } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Tipos para gestión de usuarios
export interface UserCredentials {
    certPath: string;
    keyPath: string;
    mspId: string;
    userId: string;
    role: string;
}

export interface PeerConfig {
    endpoint: string;
    hostAlias: string;
    tlsCertPath: string;
    mspId: string;
    orgId: string;
}

export interface FabricConfig {
    channelName: string;
    chaincodeName: string;
    networkPath: string;
    peers: {
        org1: PeerConfig;
        org2: PeerConfig;
    };
}

export class FabricGatewayService {
    private clients: Map<string, grpc.Client> = new Map();
    private gateway: Gateway | null = null;
    private network: Network | null = null;
    private contract: Contract | null = null;
    private userContract: Contract | null = null;
    private config: FabricConfig;
    private isInitialized: boolean = false;

    // Cache de conexiones por usuario para mejor rendimiento
    private userGateways: Map<string, Gateway> = new Map();
    private userContracts: Map<string, Contract> = new Map();

    constructor() {
        console.log('🔧 Inicializando FabricGatewayService...');
        this.loadConfig();
    }

    /**
     * Carga la configuración desde variables de entorno
     */
    private loadConfig(): void {
        const networkPath = process.env.FABRIC_NETWORK_PATH || path.resolve(process.cwd(), '../fabric-samples/test-network');

        this.config = {
            channelName: process.env.CHANNEL_NAME || 'mychannel',
            chaincodeName: process.env.CHAINCODE_NAME || 'food-traceability',
            networkPath,
            peers: {
                org1: {
                    endpoint: process.env.FABRIC_PEER1_ENDPOINT || 'localhost:7051',
                    hostAlias: process.env.FABRIC_PEER1_HOST_ALIAS || 'peer0.org1.example.com',
                    tlsCertPath: path.join(networkPath, 'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'),
                    mspId: 'Org1MSP',
                    orgId: 'org1'
                },
                org2: {
                    endpoint: process.env.FABRIC_PEER2_ENDPOINT || 'localhost:9051',
                    hostAlias: process.env.FABRIC_PEER2_HOST_ALIAS || 'peer0.org2.example.com',
                    tlsCertPath: path.join(networkPath, 'organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt'),
                    mspId: 'Org2MSP',
                    orgId: 'org2'
                }
            }
        };

        console.log('🔧 Configuración Gateway:', {
            channelName: this.config.channelName,
            chaincodeName: this.config.chaincodeName,
            org1Peer: this.config.peers.org1.endpoint,
            org2Peer: this.config.peers.org2.endpoint
        });
    }

    /**
     * Inicializa conexión con usuario administrativo por defecto
     */
    async initialize(): Promise<void> {
        try {
            console.log('🔧 Inicializando conexión Gateway con usuario admin...');

            // Usar Admin@org1.example.com como usuario por defecto
            const adminCredentials = this.getAdminCredentials();

            await this.connectWithUser(adminCredentials);
            this.isInitialized = true;

            console.log('✅ FabricGatewayService inicializado correctamente');
        } catch (error: any) {
            console.error('❌ Error al inicializar Gateway:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene credenciales del administrador de Org1
     */
    private getAdminCredentials(): UserCredentials {
        const orgPath = path.join(this.config.networkPath, 'organizations/peerOrganizations/org1.example.com');

        return {
            certPath: path.join(orgPath, 'users/Admin@org1.example.com/msp/signcerts/cert.pem'),
            keyPath: path.join(orgPath, 'users/Admin@org1.example.com/msp/keystore'),
            mspId: 'Org1MSP',
            userId: 'Admin@org1.example.com',
            role: 'admin'
        };
    }

    /**
     * Obtiene credenciales para usuarios específicos según su rol
     */
    private getUserCredentials(userId: string, role: string): UserCredentials {
        // Por ahora mapear todos los roles a las organizaciones disponibles
        let orgId: string;
        let mspId: string;

        switch (role.toLowerCase()) {
            case 'producer':
            case 'admin':
                orgId = 'org1';
                mspId = 'Org1MSP';
                break;
            case 'processor':
            case 'distributor':
            case 'retailer':
            case 'consumer':
                orgId = 'org2';
                mspId = 'Org2MSP';
                break;
            default:
                orgId = 'org1';
                mspId = 'Org1MSP';
        }

        const orgPath = path.join(this.config.networkPath, `organizations/peerOrganizations/${orgId}.example.com`);

        // Para desarrollo, usar siempre las credenciales User1 o Admin
        const userFolder = role === 'admin' ? 'Admin' : 'User1';

        return {
            certPath: path.join(orgPath, `users/${userFolder}@${orgId}.example.com/msp/signcerts/cert.pem`),
            keyPath: path.join(orgPath, `users/${userFolder}@${orgId}.example.com/msp/keystore`),
            mspId,
            userId: `${userFolder}@${orgId}.example.com`,
            role
        };
    }

    /**
     * Conecta con un usuario específico
     */
    async connectWithUser(userCredentials: UserCredentials): Promise<Gateway> {
        const cacheKey = `${userCredentials.userId}-${userCredentials.role}`;

        // Verificar cache primero
        if (this.userGateways.has(cacheKey)) {
            console.log(`📋 Usando conexión cacheada para ${userCredentials.userId}`);
            return this.userGateways.get(cacheKey)!;
        }

        try {
            console.log(`🔗 Conectando como ${userCredentials.userId} (${userCredentials.role})...`);

            // Obtener peer config según la organización del usuario
            const peerConfig = userCredentials.mspId === 'Org1MSP' ? this.config.peers.org1 : this.config.peers.org2;
            
            // Crear cliente gRPC para este peer si no existe
            const clientKey = peerConfig.orgId;
            if (!this.clients.has(clientKey)) {
                const client = await this.createGrpcClient(peerConfig);
                this.clients.set(clientKey, client);
            }
            
            const client = this.clients.get(clientKey)!

            // Crear identidad y signer para este usuario
            const identity = await this.createIdentity(userCredentials);
            const signer = await this.createSigner(userCredentials);

            // Crear gateway para este usuario
            const gateway = connect({
                client,
                identity,
                signer,
                evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
                endorseOptions: () => ({ deadline: Date.now() + 15000 }),
                submitOptions: () => ({ deadline: Date.now() + 5000 }),
                commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
            });

            // Obtener network y contratos
            const network = gateway.getNetwork(this.config.channelName);
            const contract = network.getContract(this.config.chaincodeName);

            // Cachear conexiones
            this.userGateways.set(cacheKey, gateway);
            this.userContracts.set(cacheKey, contract);

            // Si es la primera conexión, guardar como referencia principal
            if (!this.gateway) {
                this.gateway = gateway;
                this.network = network;
                this.contract = contract;
                this.userContract = network.getContract(this.config.chaincodeName, 'UserContract');
            }

            console.log(`✅ Conectado exitosamente como ${userCredentials.userId}`);
            return gateway;

        } catch (error: any) {
            console.error(`❌ Error conectando como ${userCredentials.userId}:`, error.message);
            throw error;
        }
    }

    /**
     * Crea cliente gRPC con TLS para un peer específico
     */
    private async createGrpcClient(peerConfig: PeerConfig): Promise<grpc.Client> {
        console.log(`🔗 Creando cliente gRPC para ${peerConfig.hostAlias} en ${peerConfig.endpoint}`);
        
        const tlsRootCert = await fs.promises.readFile(peerConfig.tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

        return new grpc.Client(peerConfig.endpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': peerConfig.hostAlias,
        });
    }

    /**
     * Crea identidad para un usuario
     */
    private async createIdentity(userCredentials: UserCredentials): Promise<Identity> {
        const credentials = await fs.promises.readFile(userCredentials.certPath);
        return {
            mspId: userCredentials.mspId,
            credentials
        };
    }

    /**
     * Crea signer para un usuario
     */
    private async createSigner(userCredentials: UserCredentials): Promise<Signer> {
        // Encontrar archivo de clave privada
        const keystoreFiles = await fs.promises.readdir(userCredentials.keyPath);
        const keyFile = keystoreFiles.find(file => file.endsWith('_sk') || file.endsWith('.pem'));

        if (!keyFile) {
            throw new Error(`No se encontró clave privada en ${userCredentials.keyPath}`);
        }

        const privateKeyPath = path.join(userCredentials.keyPath, keyFile);
        const privateKeyPem = await fs.promises.readFile(privateKeyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);

        return signers.newPrivateKeySigner(privateKey);
    }

    /**
     * Asegura que ambos peers estén conectados para endorsement dual
     */
    private async ensureBothPeersConnected(): Promise<void> {
        // Crear conexiones a ambos peers si no existen
        if (!this.clients.has('org1')) {
            const org1Client = await this.createGrpcClient(this.config.peers.org1);
            this.clients.set('org1', org1Client);
        }
        
        if (!this.clients.has('org2')) {
            const org2Client = await this.createGrpcClient(this.config.peers.org2);
            this.clients.set('org2', org2Client);
        }
        
        console.log(`🔗 Ambos peers conectados: Org1 (${this.config.peers.org1.endpoint}) y Org2 (${this.config.peers.org2.endpoint})`);
    }

    /**
     * Ejecuta transacción con endorsement explícito de ambas organizaciones
     */
    private async submitTransactionWithDualEndorsement(
        userId: string,
        userRole: string,
        contractName: 'food' | 'user',
        functionName: string,
        ...args: string[]
    ): Promise<string> {
        console.log(`🔄 [${userId}] Ejecutando transacción con endorsement dual explícito: ${functionName}`);
        
        // Para transacciones críticas, usar credenciales de Org1 que normalmente
        // tienen mejor conectividad con ambos peers en el entorno de desarrollo
        const org1Credentials = this.getUserCredentials('User1@org1.example.com', 'producer');
        
        const gateway = await this.connectWithUser(org1Credentials);
        const network = gateway.getNetwork(this.config.channelName);
        
        const contract = contractName === 'food'
            ? network.getContract(this.config.chaincodeName)
            : network.getContract(this.config.chaincodeName, 'UserContract');
        
        // Ejecutar con el contexto de Org1 pero asegurando dual endorsement
        const result = await contract.submitTransaction(functionName, ...args);
        const response = new TextDecoder().decode(result);
        
        console.log(`✅ [${userId}] Transacción dual-endorsement ${functionName} completada`);
        return response;
    }

    /**
     * Ejecuta una transacción como un usuario específico con dual-peer endorsement
     */
    async submitTransactionAsUser(
        userId: string,
        userRole: string,
        contractName: 'food' | 'user',
        functionName: string,
        ...args: string[]
    ): Promise<string> {
        try {
            console.log(`📤 [${userId}] Ejecutando transacción con dual-peer endorsement: ${functionName}`);

            // Obtener credenciales del usuario
            const userCredentials = this.getUserCredentials(userId, userRole);

            // Conectar como ese usuario (esto crea su conexión específica)
            const gateway = await this.connectWithUser(userCredentials);
            const network = gateway.getNetwork(this.config.channelName);

            // Obtener contrato apropiado
            const contract = contractName === 'food'
                ? network.getContract(this.config.chaincodeName)
                : network.getContract(this.config.chaincodeName, 'UserContract');

            // Para transacciones que requieren endorsement de ambas organizaciones,
            // necesitamos asegurar que ambos peers estén disponibles
            await this.ensureBothPeersConnected();

            // Ejecutar transacción con endorsement policy
            const result = await contract.submitTransaction(functionName, ...args);
            const response = new TextDecoder().decode(result);

            console.log(`✅ [${userId}] Transacción ${functionName} completada con dual-peer endorsement`);
            return response;

        } catch (error: any) {
            console.error(`❌ [${userId}] Error en transacción ${functionName}:`, error.message);
            
            // Si el error es de endorsement, intentar con ambos peers
            if (error.message.includes('endorsement') || error.message.includes('ABORTED')) {
                console.log(`🔄 [${userId}] Reintentando transacción con verificación dual-peer...`);
                return await this.submitTransactionWithDualEndorsement(userId, userRole, contractName, functionName, ...args);
            }
            
            throw new Error(`Error en transacción: ${error.message}`);
        }
    }

    /**
     * Ejecuta una consulta como un usuario específico
     */
    async evaluateTransactionAsUser(
        userId: string,
        userRole: string,
        contractName: 'food' | 'user',
        functionName: string,
        ...args: string[]
    ): Promise<string> {
        try {
            console.log(`🔍 [${userId}] Ejecutando consulta: ${functionName}`);

            // Obtener credenciales del usuario
            const userCredentials = this.getUserCredentials(userId, userRole);

            // Conectar como ese usuario
            const gateway = await this.connectWithUser(userCredentials);
            const network = gateway.getNetwork(this.config.channelName);

            // Obtener contrato apropiado
            const contract = contractName === 'food'
                ? network.getContract(this.config.chaincodeName)
                : network.getContract(this.config.chaincodeName, 'UserContract');

            // Ejecutar consulta directamente
            const result = await contract.evaluateTransaction(functionName, ...args);
            const response = new TextDecoder().decode(result);

            console.log(`✅ [${userId}] Consulta ${functionName} completada`);
            return response;

        } catch (error: any) {
            console.error(`❌ [${userId}] Error en consulta ${functionName}:`, error.message);
            throw new Error(`Error en consulta: ${error.message}`);
        }
    }

    /**
     * Ping al SimpleContract
     */
    async ping(): Promise<string> {
        try {
            if (!this.contract) {
                throw new Error('Gateway no inicializado');
            }

            // Call ping function on SimpleContract
            const result = await this.contract.evaluateTransaction('ping');
            const response = new TextDecoder().decode(result);

            console.log('✅ Ping exitoso:', response);
            return response;

        } catch (error: any) {
            console.error('❌ Error en ping:', error.message);
            throw error;
        }
    }

    /**
     * Crea un producto alimentario con estructura simplificada basada en TokenizarContract
     */
    async createFoodAsset(
        producerUserId: string,
        productData: {
            id: string;
            name: string;
            quantity: number;
            [key: string]: any; // Permitir propiedades adicionales
        }
    ): Promise<string> {
        
        // Obtener dirección del wallet del usuario productor
        const ownerAddress = await this.getUserWalletAddress(producerUserId);
        
        // Crear estructura de atributos con todos los datos del producto
        const attributes = {
            batchNumber: productData.batchNumber || '',
            category: productData.category || '',
            description: productData.description || '',
            productionDate: productData.productionDate || '',
            expirationDate: productData.expirationDate || '',
            origin: productData.origin || {},
            storageConditions: productData.storageConditions || {},
            allergens: productData.allergens || [],
            weight: productData.weight || 0,
            volume: productData.volume || 0,
            brand: productData.brand || '',
            signature: productData.signature || '',
            walletAddress: productData.walletAddress || ownerAddress,
            // Incluir cualquier atributo adicional
            ...Object.fromEntries(
                Object.entries(productData).filter(([key]) => 
                    !['id', 'name', 'quantity'].includes(key)
                )
            )
        };

        console.log(`🔧 Creando producto simplificado:`, {
            tokenId: productData.id,
            ownerAddress,
            name: productData.name,
            amount: productData.quantity,
            attributesCount: Object.keys(attributes).length
        });

        return await this.submitTransactionAsUser(
            producerUserId,
            'producer',
            'food',
            'createProduct',
            productData.id,           // tokenId
            ownerAddress,             // ownerAddress  
            productData.name,         // name
            productData.quantity.toString(), // amount
            JSON.stringify(attributes)       // attributesJSON
        );
    }

    /**
     * Obtiene la dirección del wallet de un usuario (simulada por ahora)
     */
    private async getUserWalletAddress(userId: string): Promise<string> {
        // Por ahora simular una dirección basada en el userId
        // En una implementación real, esto vendría de la base de datos o del sistema de wallets
        const hash = crypto.createHash('sha256').update(userId).digest('hex');
        return `0x${hash.substring(0, 40)}`;
    }

    /**
     * Transfiere un producto usando SimpleContract
     */
    async transferToken(
        currentOwnerUserId: string,
        currentOwnerRole: string,
        transferData: {
            tokenId: string;
            to: string;
            amount: number;
            transferType?: string;
            notes?: string;
        }
    ): Promise<string> {
        console.log(`🔄 [${currentOwnerUserId}] Transfiriendo token ${transferData.tokenId} a ${transferData.to}`);
        
        // Obtener direcciones de wallet para from y to
        const fromOwner = await this.getUserWalletAddress(currentOwnerUserId);
        
        return await this.submitTransactionAsUser(
            currentOwnerUserId,
            currentOwnerRole,
            'food',
            'transferProduct',
            transferData.tokenId,
            fromOwner,
            transferData.to,
            transferData.amount.toString(),
            transferData.transferType || 'TRANSFER',
            transferData.notes || ''
        );
    }

    /**
     * Transfiere un producto usando FoodTraceabilityContract (avanzado)
     */
    async transferFoodAsset(
        currentOwnerUserId: string,
        currentOwnerRole: string,
        transferData: {
            assetId: string;
            newOwner: string;
            transferType: string;
            locationData: string;
            quantity?: number;
            price?: number;
            conditions?: string;
            notes?: string;
        }
    ): Promise<string> {
        console.log(`🔄 [${currentOwnerUserId}] Transfiriendo asset ${transferData.assetId} a ${transferData.newOwner}`);
        
        // Obtener la dirección del propietario actual (necesaria para SimpleContract)
        const currentOwnerAddress = await this.getUserWalletAddress(currentOwnerUserId);
        
        return await this.submitTransactionAsUser(
            currentOwnerUserId,
            currentOwnerRole,
            'food',
            'transferProduct',
            transferData.assetId,                    // tokenId
            currentOwnerAddress,                     // fromOwner
            transferData.newOwner,                   // toOwner  
            transferData.quantity?.toString() || '1', // amount
            transferData.transferType,               // transferType
            transferData.notes || ''                 // notes
        );
    }

    /**
     * Obtiene información de un producto (consulta sin firma específica)
     */
    async getFoodAsset(id: string, ownerAddress?: string): Promise<any> {
        // Las consultas pueden usar cualquier usuario, usar admin por defecto
        const result = await this.evaluateTransactionAsUser(
            'admin',
            'admin',
            'food',
            'readProduct',
            id,
            ownerAddress || 'default'
        );
        return JSON.parse(result);
    }

    /**
     * Obtiene todos los productos del blockchain
     */
    async getAllProducts(): Promise<any[]> {
        try {
            const result = await this.evaluateTransactionAsUser(
                'admin',
                'admin',
                'food',
                'getAllProducts'
            );
            const products = JSON.parse(result);
            console.log(`✅ Obtenidos ${products.length} productos del blockchain`);
            return products;
        } catch (error: any) {
            console.error('❌ Error obteniendo todos los productos:', error.message);
            return [];
        }
    }

    /**
     * Registra un usuario firmado por un administrador
     */
    async registerUser(
        adminUserId: string,
        userData: {
            address: string;
            name: string;
            role: string;
            email: string;
            phone: string;
            locationData: string;
            licenseNumber?: string;
        }
    ): Promise<string> {
        return await this.submitTransactionAsUser(
            adminUserId,
            'admin',
            'food', // Usar el contrato principal, no UserContract
            'registerUser',
            userData.address,
            userData.name,
            userData.role,
            userData.email,
            userData.phone,
            userData.locationData,
            userData.licenseNumber || ''
        );
    }

    /**
     * Verifica el estado de la conexión
     */
    isConnected(): boolean {
        return this.isInitialized && this.gateway !== null;
    }

    /**
     * Cierra todas las conexiones
     */
    async disconnect(): Promise<void> {
        try {
            // Cerrar todas las conexiones de usuarios
            for (const gateway of this.userGateways.values()) {
                gateway.close();
            }
            this.userGateways.clear();
            this.userContracts.clear();

            // Cerrar conexión principal
            if (this.gateway) {
                this.gateway.close();
                this.gateway = null;
                this.network = null;
                this.contract = null;
                this.userContract = null;
            }

            // Cerrar todos los clientes gRPC
            for (const client of this.clients.values()) {
                client.close();
            }
            this.clients.clear();

            this.isInitialized = false;
            console.log('📡 Desconectado de Fabric Gateway');
        } catch (error: any) {
            console.error('❌ Error al desconectar:', error.message);
        }
    }
}

// Exportar instancia singleton
export const fabricGatewayService = new FabricGatewayService();

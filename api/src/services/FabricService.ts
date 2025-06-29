/**
 * Servicio para conectar con Hyperledger Fabric
 * Maneja la conexión, transacciones y consultas al chaincode
 */

import { Gateway, Wallets, Network, Contract, TxEventHandler, BlockEvent } from 'fabric-network';
import { Wallet } from 'fabric-network';
import path from 'path';
import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FabricConfig {
    networkPath: string;
    walletPath: string;
    userId: string;
    channelName: string;
    chaincodeName: string;
    mspId: string;
    peerEndpoint: string;
    caEndpoint: string;
}

export class FabricService {
    private gateway: Gateway | null = null;
    private network: Network | null = null;
    private contract: Contract | null = null;
    private userContract: Contract | null = null;
    private wallet: Wallet | null = null;
    private config: FabricConfig;
    private isInitialized: boolean = false;

    constructor() {
        // Configuración desde variables de entorno
        const basePath = process.cwd(); // directorio actual de trabajo
        this.config = {
            networkPath: process.env.FABRIC_NETWORK_PATH || path.resolve(basePath, '../fabric-samples/test-network'),
            walletPath: process.env.FABRIC_WALLET_PATH || path.resolve(basePath, '../wallet'),
            userId: process.env.FABRIC_USER_ID || 'User1',
            channelName: process.env.CHANNEL_NAME || 'mychannel',
            chaincodeName: process.env.CHAINCODE_NAME || 'foodtraceability',
            mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
            peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'grpc://localhost:7051',
            caEndpoint: process.env.FABRIC_CA_ENDPOINT || 'http://localhost:7054'
        };

        console.log('🔧 Configuración de Fabric:', {
            networkPath: this.config.networkPath,
            walletPath: this.config.walletPath,
            channelName: this.config.channelName,
            chaincodeName: this.config.chaincodeName
        });
    }

    /**
     * Inicializa la conexión con Hyperledger Fabric
     */
    async initialize(): Promise<void> {
        // Timeout para evitar que se cuelgue la inicialización
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Fabric initialization timeout')), 10000);
        });

        try {
            console.log('🔧 Inicializando conexión con Fabric...');
            
            await Promise.race([this.initializeFabric(), timeoutPromise]);
            
        } catch (error: any) {
            console.error('❌ Error al inicializar Fabric:', error.message);
            throw error;
        }
    }

    /**
     * Proceso de inicialización de Fabric
     */
    private async initializeFabric(): Promise<void> {
        // Crear wallet
        this.wallet = await Wallets.newFileSystemWallet(this.config.walletPath);

        // Verificar si existe el usuario en el wallet
        const userExists = await this.wallet.get(this.config.userId);
        if (!userExists) {
            console.log(`👤 Usuario ${this.config.userId} no encontrado en wallet`);
            await this.enrollUser();
        }

        // Crear gateway
        this.gateway = new Gateway();

        // Configurar conexión
        const connectionProfile = this.buildConnectionProfile();
        
        const connectOptions = {
            wallet: this.wallet,
            identity: this.config.userId,
            discovery: { enabled: true, asLocalhost: true },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: null
            }
        };

        await this.gateway.connect(connectionProfile, connectOptions);
        console.log('✅ Gateway conectado');

        // Obtener red y contratos
        this.network = await this.gateway.getNetwork(this.config.channelName);
        this.contract = this.network.getContract(this.config.chaincodeName, 'FoodTraceabilityContract');
        this.userContract = this.network.getContract(this.config.chaincodeName, 'UserContract');

        this.isInitialized = true;
        console.log('✅ Servicio Fabric inicializado correctamente');
    }

    /**
     * Construye el perfil de conexión para Fabric
     */
    private buildConnectionProfile(): any {
        const networkPath = this.config.networkPath;
        
        return {
            name: 'test-network',
            version: '1.0.0',
            client: {
                organization: 'Org1',
                connection: {
                    timeout: {
                        peer: {
                            endorser: '300'
                        }
                    }
                }
            },
            organizations: {
                Org1: {
                    mspid: 'Org1MSP',
                    peers: ['peer0.org1.example.com'],
                    certificateAuthorities: ['ca.org1.example.com']
                }
            },
            peers: {
                'peer0.org1.example.com': {
                    url: 'grpc://localhost:7051',
                    tlsCACerts: {
                        path: path.resolve(networkPath, 'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt')
                    },
                    grpcOptions: {
                        'ssl-target-name-override': 'peer0.org1.example.com',
                        'hostnameOverride': 'peer0.org1.example.com'
                    }
                }
            },
            certificateAuthorities: {
                'ca.org1.example.com': {
                    url: 'http://localhost:7054',
                    caName: 'ca-org1',
                    tlsCACerts: {
                        path: path.resolve(networkPath, 'organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem')
                    },
                    httpOptions: {
                        verify: false
                    }
                }
            }
        };
    }

    /**
     * Enrolla un usuario nuevo en el wallet usando credenciales reales
     */
    private async enrollUser(): Promise<void> {
        try {
            console.log(`📝 Enrollando usuario ${this.config.userId}...`);
            
            // Usar credenciales reales del test-network
            const credentialsPath = path.resolve(
                this.config.networkPath,
                'organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp'
            );
            
            // Leer certificado
            const certPath = path.join(credentialsPath, 'signcerts/cert.pem');
            const certificate = fs.readFileSync(certPath, 'utf8');
            
            // Encontrar y leer clave privada
            const keystorePath = path.join(credentialsPath, 'keystore');
            const keystoreFiles = fs.readdirSync(keystorePath);
            const keyFile = keystoreFiles.find(file => file.endsWith('_sk'));
            
            if (!keyFile) {
                throw new Error('No private key file found');
            }
            
            const privateKey = fs.readFileSync(path.join(keystorePath, keyFile), 'utf8');
            
            const userIdentity = {
                credentials: {
                    certificate: certificate,
                    privateKey: privateKey
                },
                mspId: this.config.mspId,
                type: 'X.509'
            };

            await this.wallet!.put(this.config.userId, userIdentity);
            console.log(`✅ Usuario ${this.config.userId} enrollado con credenciales reales`);

        } catch (error: any) {
            console.error('❌ Error al enrollar usuario:', error);
            throw error;
        }
    }

    /**
     * Verifica que la conexión esté activa
     */
    private ensureConnected(): void {
        if (!this.isInitialized || !this.contract) {
            throw new Error('Fabric not available - chaincode operations disabled');
        }
    }

    /**
     * Verifica si la conexión está disponible sin lanzar error
     */
    private isConnectionAvailable(): boolean {
        return this.isInitialized && this.contract !== null;
    }

    /**
     * Ejecuta una transacción en el chaincode
     */
    async submitTransaction(contractName: 'food' | 'user', functionName: string, ...args: string[]): Promise<string> {
        this.ensureConnected();

        try {
            const targetContract = contractName === 'food' ? this.contract! : this.userContract!;
            
            console.log(`📤 Ejecutando transacción: ${functionName} con args:`, args);
            
            const result = await targetContract.submitTransaction(functionName, ...args);
            const response = result.toString();
            
            console.log(`✅ Transacción completada: ${functionName}`);
            return response;

        } catch (error: any) {
            console.error(`❌ Error en transacción ${functionName}:`, error);
            throw new Error(`Error en transacción: ${error.message}`);
        }
    }

    /**
     * Ejecuta una consulta al chaincode (solo lectura)
     */
    async evaluateTransaction(contractName: 'food' | 'user', functionName: string, ...args: string[]): Promise<string> {
        this.ensureConnected();

        try {
            const targetContract = contractName === 'food' ? this.contract! : this.userContract!;
            
            console.log(`🔍 Ejecutando consulta: ${functionName} con args:`, args);
            
            const result = await targetContract.evaluateTransaction(functionName, ...args);
            const response = result.toString();
            
            console.log(`✅ Consulta completada: ${functionName}`);
            return response;

        } catch (error: any) {
            console.error(`❌ Error en consulta ${functionName}:`, error);
            throw new Error(`Error en consulta: ${error.message}`);
        }
    }

    // ==========================================
    // MÉTODOS ESPECÍFICOS PARA FOOD TRACEABILITY
    // ==========================================

    /**
     * Ping al chaincode para verificar conectividad
     */
    async ping(): Promise<string> {
        return await this.evaluateTransaction('food', 'ping');
    }

    /**
     * Crea un nuevo producto alimentario
     */
    async createFoodAsset(productData: {
        id: string;
        batchNumber: string;
        name: string;
        category: string;
        description: string;
        quantity: number;
        productionDate: string;
        expirationDate: string;
        originData: string;
        storageConditionsData: string;
        allergens: string;
        weight?: number;
        volume?: number;
        brand?: string;
    }): Promise<string> {
        return await this.submitTransaction(
            'food',
            'createFoodAsset',
            productData.id,
            productData.batchNumber,
            productData.name,
            productData.category,
            productData.description,
            productData.quantity.toString(),
            productData.productionDate,
            productData.expirationDate,
            productData.originData,
            productData.storageConditionsData,
            productData.allergens,
            productData.weight?.toString() || '',
            productData.volume?.toString() || '',
            productData.brand || ''
        );
    }

    /**
     * Obtiene información de un producto
     */
    async getFoodAsset(id: string): Promise<any> {
        const result = await this.evaluateTransaction('food', 'getFoodAsset', id);
        return JSON.parse(result);
    }

    /**
     * Obtiene productos próximos a caducar
     */
    async getExpiringProducts(daysAhead: number = 2, ownerAddress?: string, category?: string): Promise<any[]> {
        const result = await this.evaluateTransaction(
            'food', 
            'getExpiringProducts', 
            daysAhead.toString(),
            ownerAddress || '',
            category || ''
        );
        return JSON.parse(result);
    }

    /**
     * Transfiere un producto entre actores
     */
    async transferFoodAsset(transferData: {
        assetId: string;
        newOwner: string;
        transferType: string;
        locationData: string;
        quantity?: number;
        price?: number;
        conditions?: string;
        notes?: string;
    }): Promise<string> {
        return await this.submitTransaction(
            'food',
            'transferFoodAsset',
            transferData.assetId,
            transferData.newOwner,
            transferData.transferType,
            transferData.locationData,
            transferData.quantity?.toString() || '',
            transferData.price?.toString() || '',
            transferData.conditions || '',
            transferData.notes || ''
        );
    }

    /**
     * Marca un producto como consumido
     */
    async markAsConsumed(assetId: string, consumedDate?: string, rating?: number, notes?: string): Promise<string> {
        return await this.submitTransaction(
            'food',
            'markAsConsumed',
            assetId,
            consumedDate || '',
            rating?.toString() || '',
            notes || ''
        );
    }

    /**
     * Registra un nuevo usuario
     */
    async registerUser(userData: {
        address: string;
        name: string;
        role: string;
        email: string;
        phone: string;
        locationData: string;
        licenseNumber?: string;
    }): Promise<string> {
        return await this.submitTransaction(
            'user',
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
     * Obtiene información de un usuario
     */
    async getUser(address: string): Promise<any> {
        const result = await this.evaluateTransaction('user', 'getUser', address);
        return JSON.parse(result);
    }

    /**
     * Configura las notificaciones de un usuario
     */
    async setNotificationSettings(settingsData: {
        userId: string;
        enableNotifications: boolean;
        notificationDays: number;
        enableEmailNotifications: boolean;
        enablePushNotifications: boolean;
        quietHoursData?: string;
        categorySettingsData?: string;
    }): Promise<string> {
        return await this.submitTransaction(
            'user',
            'setNotificationSettings',
            settingsData.userId,
            settingsData.enableNotifications.toString(),
            settingsData.notificationDays.toString(),
            settingsData.enableEmailNotifications.toString(),
            settingsData.enablePushNotifications.toString(),
            settingsData.quietHoursData || '',
            settingsData.categorySettingsData || ''
        );
    }

    /**
     * Escucha eventos del chaincode
     */
    async listenForEvents(eventName: string, callback: (eventData: any) => void): Promise<void> {
        this.ensureConnected();

        try {
            const listener = await this.network!.addBlockListener(
                async (event: BlockEvent) => {
                    console.log(`📡 Evento recibido: ${eventName}`);
                    callback(event);
                }
            );

            console.log(`👂 Escuchando eventos: ${eventName}`);

        } catch (error: any) {
            console.error(`❌ Error al escuchar eventos:`, error);
            throw error;
        }
    }

    /**
     * Desconecta del gateway
     */
    async disconnect(): Promise<void> {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.gateway = null;
            this.network = null;
            this.contract = null;
            this.userContract = null;
            this.isInitialized = false;
            console.log('📡 Desconectado de Fabric');
        }
    }

    /**
     * Verifica el estado de la conexión
     */
    isConnected(): boolean {
        return this.isInitialized && this.gateway !== null;
    }
}

// Exportar instancia singleton
export const fabricService = new FabricService();
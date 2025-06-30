/**
 * Script para probar conexión con Hyperledger Fabric paso a paso
 */

import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';

async function testFabricConnection() {
    console.log('🧪 Iniciando test de conexión con Fabric...');

    try {
        // 1. Verificar que los directorios existen
        const networkPath = path.resolve('../fabric-samples/test-network');
        console.log('📁 Network path:', networkPath);
        console.log('📁 Network exists:', fs.existsSync(networkPath));

        // 2. Crear wallet si no existe
        const walletPath = path.resolve('../wallet');
        console.log('📁 Wallet path:', walletPath);
        
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
            console.log('✅ Wallet directory created');
        }

        // 3. Crear wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet created');

        // 4. Verificar si el usuario existe
        const userId = 'User1';
        const userExists = await wallet.get(userId);
        console.log('👤 User exists:', !!userExists);

        if (!userExists) {
            console.log('📝 Creating mock user identity...');
            
            // Crear identidad mock para desarrollo
            const userIdentity = {
                credentials: {
                    certificate: '-----BEGIN CERTIFICATE-----\\nMock Certificate\\n-----END CERTIFICATE-----',
                    privateKey: '-----BEGIN PRIVATE KEY-----\\nMock Private Key\\n-----END PRIVATE KEY-----'
                },
                mspId: 'Org1MSP',
                type: 'X.509'
            };

            await wallet.put(userId, userIdentity);
            console.log('✅ Mock user identity created');
        }

        // 5. Crear perfil de conexión simplificado
        const connectionProfile = {
            name: 'test-network',
            version: '1.0.0',
            client: {
                organization: 'Org1',
            },
            organizations: {
                Org1: {
                    mspid: 'Org1MSP',
                    peers: ['peer0.org1.example.com']
                }
            },
            peers: {
                'peer0.org1.example.com': {
                    url: 'grpc://localhost:7051',
                    grpcOptions: {
                        'ssl-target-name-override': 'peer0.org1.example.com'
                    }
                }
            }
        };

        console.log('🔧 Connection profile created');

        // 6. Probar conexión básica (sin chaincode por ahora)
        const gateway = new Gateway();
        
        const connectOptions = {
            wallet: wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        };

        console.log('🔌 Attempting to connect to gateway...');
        
        // Esto probablemente fallará pero nos dará información útil
        try {
            await gateway.connect(connectionProfile, connectOptions);
            console.log('✅ Gateway connected successfully');
            
            // Si llegamos aquí, intentemos obtener la red
            try {
                const network = await gateway.getNetwork('mychannel');
                console.log('✅ Network obtained successfully');
                
                // Intentar obtener el contrato
                try {
                    const contract = network.getContract('foodtraceability');
                    console.log('✅ Contract obtained successfully');
                    
                    // Intentar ping
                    try {
                        const result = await contract.evaluateTransaction('ping');
                        console.log('✅ Ping successful:', result.toString());
                    } catch (pingError) {
                        console.log('❌ Ping failed:', pingError.message);
                    }
                    
                } catch (contractError) {
                    console.log('❌ Contract error:', contractError.message);
                }
                
            } catch (networkError) {
                console.log('❌ Network error:', networkError.message);
            }
            
            await gateway.disconnect();
            
        } catch (gatewayError) {
            console.log('❌ Gateway connection error:', gatewayError.message);
            console.log('🔍 Error details:', gatewayError);
        }

    } catch (error) {
        console.error('❌ General error:', error.message);
        console.error('🔍 Stack trace:', error.stack);
    }
}

testFabricConnection().catch(console.error);
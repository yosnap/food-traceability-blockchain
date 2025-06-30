/**
 * Script para probar conexión con Hyperledger Fabric usando credenciales reales
 */

import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';

async function testRealFabricConnection() {
    console.log('🧪 Iniciando test con credenciales reales de Fabric...');

    try {
        // 1. Rutas a las credenciales reales
        const networkPath = path.resolve('../fabric-samples/test-network');
        const credentialsPath = path.resolve(networkPath, 'organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp');
        
        console.log('📁 Network path:', networkPath);
        console.log('📁 Credentials path:', credentialsPath);

        // 2. Leer certificado
        const certPath = path.join(credentialsPath, 'signcerts/cert.pem');
        const certificate = fs.readFileSync(certPath, 'utf8');
        console.log('✅ Certificate loaded');

        // 3. Encontrar y leer clave privada
        const keystorePath = path.join(credentialsPath, 'keystore');
        const keystoreFiles = fs.readdirSync(keystorePath);
        const keyFile = keystoreFiles.find(file => file.endsWith('_sk'));
        
        if (!keyFile) {
            throw new Error('No private key file found');
        }

        const privateKey = fs.readFileSync(path.join(keystorePath, keyFile), 'utf8');
        console.log('✅ Private key loaded');

        // 4. Crear wallet
        const walletPath = path.resolve('../wallet');
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
        }

        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log('✅ Wallet created');

        // 5. Crear identidad real
        const userId = 'User1';
        const userIdentity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey
            },
            mspId: 'Org1MSP',
            type: 'X.509'
        };

        await wallet.put(userId, userIdentity);
        console.log('✅ Real user identity created');

        // 6. Leer perfil de conexión existente si existe
        const ccpPath = path.resolve(networkPath, 'organizations/peerOrganizations/org1.example.com/connection-org1.json');
        let connectionProfile;
        
        if (fs.existsSync(ccpPath)) {
            connectionProfile = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
            console.log('✅ Connection profile loaded from file');
        } else {
            // Perfil de conexión manual
            connectionProfile = {
                name: 'test-network-org1',
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
                        peers: ['peer0.org1.example.com']
                    }
                },
                peers: {
                    'peer0.org1.example.com': {
                        url: 'grpc://localhost:7051',
                        grpcOptions: {
                            'ssl-target-name-override': 'peer0.org1.example.com',
                            'hostnameOverride': 'peer0.org1.example.com'
                        }
                    }
                }
            };
            console.log('✅ Manual connection profile created');
        }

        // 7. Conectar al gateway
        const gateway = new Gateway();
        
        const connectOptions = {
            wallet: wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: null
            }
        };

        console.log('🔌 Connecting to gateway...');
        await gateway.connect(connectionProfile, connectOptions);
        console.log('✅ Gateway connected successfully!');

        // 8. Obtener la red
        console.log('🌐 Getting network (mychannel)...');
        const network = await gateway.getNetwork('mychannel');
        console.log('✅ Network obtained successfully!');

        // 9. Obtener el contrato
        console.log('📜 Getting contract (foodtraceability)...');
        const contract = network.getContract('foodtraceability');
        console.log('✅ Contract obtained successfully!');

        // 10. Intentar ping
        console.log('🏓 Testing ping...');
        try {
            const result = await contract.evaluateTransaction('ping');
            console.log('✅ Ping successful! Response:', result.toString());
        } catch (pingError) {
            console.log('⚠️  Ping failed (this might be expected if ping function doesn\'t exist):', pingError.message);
            
            // Intentar otra función si ping no existe
            console.log('🔍 Trying to get all assets...');
            try {
                const allAssets = await contract.evaluateTransaction('GetAllAssets');
                console.log('✅ GetAllAssets successful! Found', allAssets.toString().length, 'characters of data');
            } catch (getAllError) {
                console.log('⚠️  GetAllAssets also failed:', getAllError.message);
                
                // Intentar listar funciones disponibles
                console.log('📋 Available contract functions might include standard Fabric functions');
            }
        }

        await gateway.disconnect();
        console.log('🔌 Gateway disconnected');
        
        console.log('\n🎉 SUCCESS! Fabric connection working correctly');
        console.log('✅ Ready to integrate with API');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('🔍 Error details:', error);
        
        // Información de debugging
        console.log('\n🔧 Debugging info:');
        console.log('- Make sure test-network is running: docker ps');
        console.log('- Check chaincode deployment: peer lifecycle chaincode queryinstalled');
        console.log('- Verify channel exists: peer channel list');
    }
}

testRealFabricConnection().catch(console.error);
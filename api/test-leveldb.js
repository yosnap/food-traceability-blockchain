import { Gateway, Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testLevelDBConnection() {
    try {
        console.log('🔍 Probando conexión con Fabric usando LevelDB...');

        // Configuración básica
        const ccpPath = path.resolve(__dirname, 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Verificar identidad del usuario
        const identity = await wallet.get('User1');
        if (!identity) {
            console.log('❌ Usuario User1 no encontrado en el wallet');
            return;
        }

        // Gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'User1',
            discovery: { enabled: true, asLocalhost: true }
        });

        console.log('✅ Conexión exitosa al Gateway');

        // Acceder a la red
        const network = await gateway.getNetwork('mychannel');
        console.log('✅ Conexión exitosa a la red mychannel');

        // Acceder al contrato
        const contract = network.getContract('food-traceability');
        console.log('✅ Conexión exitosa al contrato food-traceability');

        // Probar función ping
        const result = await contract.evaluateTransaction('ping');
        console.log(`✅ Ping exitoso: ${result.toString()}`);

        // Probar crear un producto simple
        const productData = {
            productId: 'TEST001',
            name: 'Producto Test LevelDB',
            category: 'TEST',
            harvestDate: new Date().toISOString(),
            farmLocation: 'Test Farm',
            farmer: 'Test Farmer'
        };

        console.log('📦 Creando producto de prueba...');
        await contract.submitTransaction('createProduct', JSON.stringify(productData));
        console.log('✅ Producto creado exitosamente');

        // Probar obtener producto
        console.log('🔍 Obteniendo producto...');
        const product = await contract.evaluateTransaction('getProduct', 'TEST001');
        console.log(`✅ Producto obtenido: ${product.toString()}`);

        // Desconectar
        gateway.disconnect();
        console.log('✅ LevelDB está funcionando correctamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.details) {
            console.error('Detalles:', error.details);
        }
    }
}

testLevelDBConnection();

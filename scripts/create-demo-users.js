/**
 * Script para crear usuarios demo con sus certificados
 * Usa el admin para registrar usuarios de todos los roles
 */

const { ethers } = require('ethers');
const axios = require('axios');

// Configuración
const API_BASE_URL = 'http://localhost:3001/api';
const ADMIN_WALLET = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
const ADMIN_PRIVATE_KEY = '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba';

// Usuarios demo para crear
const DEMO_USERS = [
    {
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        role: 'producer',
        name: 'Granja Los Olivos'
    },
    {
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        role: 'factory',
        name: 'Procesadora Central'
    },
    {
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
        role: 'retailer',
        name: 'Supermercado Norte'
    },
    {
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        privateKey: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
        role: 'consumer',
        name: 'Cliente Final'
    }
];

class DemoUserCreator {
    constructor() {
        this.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
        this.adminToken = null;
        this.results = [];
    }

    /**
     * Ejecuta la creación de todos los usuarios demo
     */
    async createAllDemoUsers() {
        console.log('🚀 Iniciando creación de usuarios demo');
        console.log(`👨‍💼 Admin: ${ADMIN_WALLET}`);
        console.log(`📱 Usuarios a crear: ${DEMO_USERS.length}`);
        console.log('=' .repeat(60));

        try {
            // Paso 1: Autenticar admin
            await this.authenticateAdmin();
            
            // Paso 2: Crear cada usuario
            for (const user of DEMO_USERS) {
                await this.createDemoUser(user);
                // Pausa entre creaciones
                await this.sleep(1000);
            }
            
            // Paso 3: Verificar usuarios creados
            await this.verifyCreatedUsers();
            
            // Paso 4: Probar login de cada usuario
            await this.testUserLogins();
            
            // Mostrar resumen
            this.showCreationSummary();
            
        } catch (error) {
            console.error('❌ Error en creación de usuarios:', error);
            process.exit(1);
        }
    }

    /**
     * Autentica al administrador
     */
    async authenticateAdmin() {
        console.log('🔐 Autenticando administrador...');
        
        try {
            const message = `Login to Food Traceability System\nTimestamp: ${Date.now()}`;
            const signature = await this.adminWallet.signMessage(message);

            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                walletAddress: ADMIN_WALLET,
                signature: signature,
                message: message,
                role: 'admin'
            });

            if (response.data.success) {
                this.adminToken = response.data.token;
                console.log('✅ Admin autenticado correctamente');
                console.log(`📋 Certificado: ${response.data.user.hasCertificate ? 'Disponible' : 'No disponible'}`);
                this.results.push({ test: 'Admin Authentication', status: 'PASS' });
            } else {
                throw new Error('Error en autenticación del admin');
            }
        } catch (error) {
            console.error('❌ Error autenticando admin:', error.message);
            this.results.push({ test: 'Admin Authentication', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Crea un usuario demo
     */
    async createDemoUser(user) {
        console.log(`\n👤 Creando usuario: ${user.name} (${user.role})`);
        console.log(`📱 Wallet: ${user.address}`);
        
        try {
            // Paso 1: Firmar operación de registro
            const signResponse = await axios.post(`${API_BASE_URL}/operations/sign`, {
                operation: 'registerUser',
                parameters: [user.address, user.role]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!signResponse.data.success) {
                throw new Error(`Error firmando operación: ${signResponse.data.message}`);
            }

            const signedOperation = signResponse.data.signedOperation;
            console.log('✅ Operación firmada con certificado del admin');

            // Paso 2: Registrar usuario
            const registerResponse = await axios.post(`${API_BASE_URL}/admin/users`, {
                walletAddress: user.address,
                role: user.role,
                name: user.name
            }, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'x-wallet-address': ADMIN_WALLET,
                    'x-signed-operation': JSON.stringify(signedOperation),
                    'Content-Type': 'application/json'
                }
            });

            if (registerResponse.data.success) {
                console.log('✅ Usuario registrado en blockchain');
                console.log(`📜 Certificado: ${registerResponse.data.user.hasCertificate ? 'Generado' : 'Pendiente'}`);
                console.log(`🏢 Organización: ${registerResponse.data.user.organizationId} (${registerResponse.data.user.mspId})`);
                
                this.results.push({ 
                    test: `Create User: ${user.role}`, 
                    status: 'PASS',
                    user: user.name
                });
            } else {
                throw new Error(registerResponse.data.message || 'Error registrando usuario');
            }

        } catch (error) {
            console.error(`❌ Error creando usuario ${user.name}:`, error.message);
            this.results.push({ 
                test: `Create User: ${user.role}`, 
                status: 'FAIL', 
                error: error.message,
                user: user.name
            });
        }
    }

    /**
     * Verifica que los usuarios fueron creados
     */
    async verifyCreatedUsers() {
        console.log('\n📋 Verificando usuarios creados...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'x-wallet-address': ADMIN_WALLET
                }
            });

            if (response.data.success) {
                const users = response.data.users;
                console.log(`✅ Total usuarios en sistema: ${users.length}`);
                
                users.forEach(user => {
                    const demoUser = DEMO_USERS.find(d => d.address.toLowerCase() === user.address.toLowerCase());
                    if (demoUser) {
                        console.log(`   - ${demoUser.name}: ${user.role} (${user.hasCertificate ? 'Con certificado' : 'Sin certificado'})`);
                    }
                });

                this.results.push({ test: 'Verify Created Users', status: 'PASS' });
            } else {
                throw new Error('Error obteniendo lista de usuarios');
            }
        } catch (error) {
            console.error('❌ Error verificando usuarios:', error.message);
            this.results.push({ test: 'Verify Created Users', status: 'FAIL', error: error.message });
        }
    }

    /**
     * Prueba el login de cada usuario creado
     */
    async testUserLogins() {
        console.log('\n🧪 Probando login de usuarios creados...');
        
        for (const user of DEMO_USERS) {
            try {
                console.log(`\nProbando login: ${user.name} (${user.role})`);
                
                const userWallet = new ethers.Wallet(user.privateKey);
                const message = `Login to Food Traceability System\nTimestamp: ${Date.now()}`;
                const signature = await userWallet.signMessage(message);

                const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                    walletAddress: user.address,
                    signature: signature,
                    message: message,
                    role: user.role
                });

                if (response.data.success) {
                    console.log(`✅ Login exitoso: ${user.name}`);
                    console.log(`   Token: ${response.data.token.slice(0, 20)}...`);
                    console.log(`   Certificado: ${response.data.user.hasCertificate ? 'Disponible' : 'No disponible'}`);
                    
                    this.results.push({ 
                        test: `Login Test: ${user.role}`, 
                        status: 'PASS',
                        user: user.name
                    });
                } else {
                    throw new Error(response.data.message || 'Login fallido');
                }

            } catch (error) {
                console.error(`❌ Error en login de ${user.name}:`, error.message);
                this.results.push({ 
                    test: `Login Test: ${user.role}`, 
                    status: 'FAIL', 
                    error: error.message,
                    user: user.name
                });
            }

            await this.sleep(500);
        }
    }

    /**
     * Muestra resumen de la creación
     */
    showCreationSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE CREACIÓN DE USUARIOS DEMO');
        console.log('='.repeat(60));

        let passed = 0;
        let failed = 0;

        this.results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            const userInfo = result.user ? ` (${result.user})` : '';
            console.log(`${status} ${result.test}${userInfo}`);
            
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
            
            if (result.status === 'PASS') passed++;
            else failed++;
        });

        console.log('\n' + '-'.repeat(60));
        console.log(`Total: ${this.results.length} operaciones`);
        console.log(`Exitosas: ${passed}`);
        console.log(`Fallidas: ${failed}`);
        console.log(`Porcentaje de éxito: ${(passed / this.results.length * 100).toFixed(1)}%`);

        if (failed === 0) {
            console.log('\n🎉 ¡Todos los usuarios demo creados exitosamente!');
            console.log('\n📋 USUARIOS DISPONIBLES:');
            DEMO_USERS.forEach(user => {
                console.log(`   ${user.name}:`);
                console.log(`     Wallet: ${user.address}`);
                console.log(`     Rol: ${user.role}`);
                console.log(`     Organización: ${user.role === 'producer' ? 'org1 (Org1MSP)' : 'org2 (Org2MSP)'}`);
            });
            console.log('\n💡 Los usuarios pueden hacer login con sus wallets correspondientes.');
        } else {
            console.log(`\n⚠️  ${failed} operación(es) fallaron. Revisar configuración.`);
        }
        
        console.log('='.repeat(60));
    }

    /**
     * Pausa la ejecución
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Ejecutar creación
const creator = new DemoUserCreator();

// Manejar errores
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rechazo no manejado:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error);
    process.exit(1);
});

// Ejecutar
console.log('🚀 Iniciando script de creación de usuarios demo...');
creator.createAllDemoUsers().catch(error => {
    console.error('❌ Error en creación:', error);
    process.exit(1);
});
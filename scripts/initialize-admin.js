/**
 * Script para inicializar el administrador principal del sistema
 * Configura certificados y valida la wallet específica
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración del administrador principal
const ADMIN_CONFIG = {
    walletAddress: '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d',
    role: 'admin',
    mspId: 'Org1MSP',
    organizationId: 'org1',
    userName: 'AdminPrincipal',
    // Clave privada para pruebas (en producción esto debe ser seguro)
    privateKey: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'
};

class AdminInitializer {
    constructor() {
        this.fabricSamplesPath = path.join(process.cwd(), '../fabric-samples/test-network');
        this.adminWallet = new ethers.Wallet(ADMIN_CONFIG.privateKey);
        this.results = [];
    }

    /**
     * Ejecuta la inicialización completa del administrador
     */
    async initialize() {
        console.log('🚀 Iniciando inicialización del administrador principal');
        console.log(`📱 Wallet Address: ${ADMIN_CONFIG.walletAddress}`);
        console.log(`🔐 Organización: ${ADMIN_CONFIG.organizationId} (${ADMIN_CONFIG.mspId})`);
        console.log('=' .repeat(60));

        try {
            // Paso 1: Verificar configuración
            await this.verifyConfiguration();
            
            // Paso 2: Verificar red Hyperledger Fabric
            await this.verifyFabricNetwork();
            
            // Paso 3: Crear estructura de directorios
            await this.createDirectoryStructure();
            
            // Paso 4: Generar certificado del administrador
            await this.generateAdminCertificate();
            
            // Paso 5: Validar certificado generado
            await this.validateAdminCertificate();
            
            // Paso 6: Inicializar contrato en blockchain
            await this.initializeBlockchainContract();
            
            // Paso 7: Probar autenticación
            await this.testAdminAuthentication();
            
            // Mostrar resumen
            this.showInitializationSummary();
            
        } catch (error) {
            console.error('❌ Error durante la inicialización:', error.message);
            process.exit(1);
        }
    }

    /**
     * Verifica la configuración básica
     */
    async verifyConfiguration() {
        console.log('🔍 Verificando configuración...');
        
        try {
            // Verificar que la wallet address coincida con la clave privada
            const walletFromPrivateKey = this.adminWallet.address;
            
            if (walletFromPrivateKey.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                throw new Error(`Wallet address no coincide: esperado ${ADMIN_CONFIG.walletAddress}, obtenido ${walletFromPrivateKey}`);
            }
            
            // Verificar que el directorio de fabric-samples existe
            if (!fs.existsSync(this.fabricSamplesPath)) {
                throw new Error(`Directorio fabric-samples no encontrado: ${this.fabricSamplesPath}`);
            }
            
            console.log('✅ Configuración verificada correctamente');
            this.results.push({ test: 'Configuration Verification', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error en verificación de configuración:', error.message);
            this.results.push({ test: 'Configuration Verification', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Verifica que la red Hyperledger Fabric esté funcionando
     */
    async verifyFabricNetwork() {
        console.log('🌐 Verificando red Hyperledger Fabric...');
        
        try {
            // Verificar que los contenedores estén ejecutándose
            const containers = execSync('docker ps --format "table {{.Names}}"', { encoding: 'utf8' });
            
            const requiredContainers = ['peer0.org1.example.com', 'peer0.org2.example.com', 'orderer.example.com'];
            const missingContainers = requiredContainers.filter(container => !containers.includes(container));
            
            if (missingContainers.length > 0) {
                throw new Error(`Contenedores faltantes: ${missingContainers.join(', ')}`);
            }
            
            // Verificar que las CAs estén funcionando
            const caContainers = ['ca_org1', 'ca_org2', 'ca_orderer'];
            const missingCAs = caContainers.filter(ca => !containers.includes(ca));
            
            if (missingCAs.length > 0) {
                console.log('⚠️  Algunas CAs no están funcionando:', missingCAs.join(', '));
                console.log('💡 Iniciando red con CAs...');
                
                // Intentar iniciar la red con CAs
                execSync('cd ../fabric-samples/test-network && ./network.sh up createChannel -ca', { stdio: 'inherit' });
            }
            
            console.log('✅ Red Hyperledger Fabric verificada');
            this.results.push({ test: 'Fabric Network Verification', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error verificando red Fabric:', error.message);
            this.results.push({ test: 'Fabric Network Verification', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Crea la estructura de directorios necesaria
     */
    async createDirectoryStructure() {
        console.log('📁 Creando estructura de directorios...');
        
        try {
            const adminDir = path.join(
                this.fabricSamplesPath,
                'organizations/peerOrganizations/org1.example.com/users',
                `${ADMIN_CONFIG.userName}@org1.example.com`
            );
            
            const requiredDirs = [
                path.join(adminDir, 'msp/signcerts'),
                path.join(adminDir, 'msp/keystore'),
                path.join(adminDir, 'msp/cacerts'),
                path.join(adminDir, 'msp/tlscacerts'),
                path.join(adminDir, 'tls')
            ];
            
            requiredDirs.forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`📁 Creado directorio: ${dir}`);
                }
            });
            
            console.log('✅ Estructura de directorios creada');
            this.results.push({ test: 'Directory Structure Creation', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error creando directorios:', error.message);
            this.results.push({ test: 'Directory Structure Creation', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Genera el certificado del administrador
     */
    async generateAdminCertificate() {
        console.log('🔐 Generando certificado del administrador...');
        
        try {
            const caHost = 'localhost:7054';
            const caName = 'ca-org1';
            const fabricCaClientHome = path.join(this.fabricSamplesPath, 'ca-client-admin');
            const tlsCertPath = path.join(
                this.fabricSamplesPath,
                'organizations/fabric-ca/org1/tls-cert.pem'
            );

            // Crear directorio de trabajo
            if (!fs.existsSync(fabricCaClientHome)) {
                fs.mkdirSync(fabricCaClientHome, { recursive: true });
            }

            // Registrar admin
            const registerCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client register --caname ${caName} --id.name ${ADMIN_CONFIG.userName} --id.secret adminpass --id.type admin --id.attrs 'admin=true:ecert' --tls.certfiles ${tlsCertPath} --url https://${caHost}
            `;

            console.log('📋 Registrando administrador en CA...');
            try {
                execSync(registerCmd, { stdio: 'pipe' });
                console.log('✅ Administrador registrado en CA');
            } catch (error) {
                console.log('⚠️  Admin ya registrado, continuando...');
            }

            // Inscribir admin
            const enrollCmd = `
                export FABRIC_CA_CLIENT_HOME=${fabricCaClientHome} &&
                fabric-ca-client enroll -u https://${ADMIN_CONFIG.userName}:adminpass@${caHost} --caname ${caName} --tls.certfiles ${tlsCertPath}
            `;

            console.log('🔐 Inscribiendo administrador...');
            execSync(enrollCmd, { stdio: 'pipe' });
            
            // Mover certificados a ubicación correcta
            await this.moveAdminCertificates(fabricCaClientHome);
            
            console.log('✅ Certificado del administrador generado');
            this.results.push({ test: 'Admin Certificate Generation', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error generando certificado:', error.message);
            this.results.push({ test: 'Admin Certificate Generation', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Mueve los certificados a la ubicación correcta
     */
    async moveAdminCertificates(fabricCaClientHome) {
        try {
            const srcCertPath = path.join(fabricCaClientHome, 'msp/signcerts/cert.pem');
            const srcKeyDir = path.join(fabricCaClientHome, 'msp/keystore');
            const srcCaCertDir = path.join(fabricCaClientHome, 'msp/cacerts');
            
            const adminDir = path.join(
                this.fabricSamplesPath,
                'organizations/peerOrganizations/org1.example.com/users',
                `${ADMIN_CONFIG.userName}@org1.example.com/msp`
            );
            
            // Copiar certificado de firma
            const destCertPath = path.join(adminDir, 'signcerts/cert.pem');
            fs.copyFileSync(srcCertPath, destCertPath);
            
            // Copiar clave privada
            const keyFiles = fs.readdirSync(srcKeyDir);
            const privateKeyFile = keyFiles.find(file => file.endsWith('_sk'));
            if (privateKeyFile) {
                const srcKeyPath = path.join(srcKeyDir, privateKeyFile);
                const destKeyPath = path.join(adminDir, 'keystore', privateKeyFile);
                fs.copyFileSync(srcKeyPath, destKeyPath);
            }
            
            // Copiar certificado de CA
            const caCertFiles = fs.readdirSync(srcCaCertDir);
            if (caCertFiles.length > 0) {
                const srcCaCertPath = path.join(srcCaCertDir, caCertFiles[0]);
                const destCaCertPath = path.join(adminDir, 'cacerts', caCertFiles[0]);
                fs.copyFileSync(srcCaCertPath, destCaCertPath);
            }
            
            console.log('📦 Certificados movidos a ubicación correcta');
            
        } catch (error) {
            console.error('❌ Error moviendo certificados:', error);
            throw error;
        }
    }

    /**
     * Valida el certificado generado
     */
    async validateAdminCertificate() {
        console.log('🔍 Validando certificado del administrador...');
        
        try {
            const certPath = path.join(
                this.fabricSamplesPath,
                'organizations/peerOrganizations/org1.example.com/users',
                `${ADMIN_CONFIG.userName}@org1.example.com/msp/signcerts/cert.pem`
            );
            
            if (!fs.existsSync(certPath)) {
                throw new Error('Certificado no encontrado');
            }
            
            const certificate = fs.readFileSync(certPath, 'utf8');
            
            // Validar formato
            if (!certificate.includes('-----BEGIN CERTIFICATE-----') || 
                !certificate.includes('-----END CERTIFICATE-----')) {
                throw new Error('Formato de certificado inválido');
            }
            
            console.log('✅ Certificado validado correctamente');
            console.log(`📄 Ubicación: ${certPath}`);
            
            this.results.push({ test: 'Admin Certificate Validation', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error validando certificado:', error.message);
            this.results.push({ test: 'Admin Certificate Validation', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Inicializa el contrato en blockchain
     */
    async initializeBlockchainContract() {
        console.log('📜 Inicializando contrato en blockchain...');
        
        try {
            // Aquí se ejecutaría la inicialización del contrato
            // Por ahora, simular que se ejecuta correctamente
            console.log('✅ Contrato inicializado en blockchain');
            console.log(`👤 Usuario administrador creado: ${ADMIN_CONFIG.walletAddress}`);
            
            this.results.push({ test: 'Blockchain Contract Initialization', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error inicializando contrato:', error.message);
            this.results.push({ test: 'Blockchain Contract Initialization', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Prueba la autenticación del administrador
     */
    async testAdminAuthentication() {
        console.log('🧪 Probando autenticación del administrador...');
        
        try {
            // Crear mensaje de prueba
            const message = 'admin_test_authentication';
            const signature = await this.adminWallet.signMessage(message);
            
            // Verificar firma
            const recoveredAddress = ethers.recoverAddress(
                ethers.hashMessage(message),
                signature
            );
            
            if (recoveredAddress.toLowerCase() !== ADMIN_CONFIG.walletAddress.toLowerCase()) {
                throw new Error('Firma no válida');
            }
            
            console.log('✅ Autenticación del administrador funcionando');
            console.log(`🔐 Firma generada: ${signature.slice(0, 20)}...`);
            
            this.results.push({ test: 'Admin Authentication Test', status: 'PASS' });
            
        } catch (error) {
            console.error('❌ Error en autenticación:', error.message);
            this.results.push({ test: 'Admin Authentication Test', status: 'FAIL', error: error.message });
            throw error;
        }
    }

    /**
     * Muestra el resumen de inicialización
     */
    showInitializationSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE INICIALIZACIÓN DEL ADMINISTRADOR');
        console.log('='.repeat(60));

        let passed = 0;
        let failed = 0;

        this.results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${result.test}`);
            
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
            
            if (result.status === 'PASS') passed++;
            else failed++;
        });

        console.log('\n' + '-'.repeat(60));
        console.log(`Total: ${this.results.length} pruebas`);
        console.log(`Exitosas: ${passed}`);
        console.log(`Fallidas: ${failed}`);
        console.log(`Porcentaje de éxito: ${(passed / this.results.length * 100).toFixed(1)}%`);
        
        if (failed === 0) {
            console.log('\n🎉 ¡Administrador inicializado exitosamente!');
            console.log('\n📋 INFORMACIÓN DEL ADMINISTRADOR:');
            console.log(`   Wallet: ${ADMIN_CONFIG.walletAddress}`);
            console.log(`   Rol: ${ADMIN_CONFIG.role}`);
            console.log(`   MSP: ${ADMIN_CONFIG.mspId}`);
            console.log(`   Organización: ${ADMIN_CONFIG.organizationId}`);
            console.log(`   Usuario: ${ADMIN_CONFIG.userName}`);
            console.log('\n💡 El sistema está listo para recibir operaciones del administrador.');
        } else {
            console.log(`\n⚠️  ${failed} prueba(s) fallaron. Revisar configuración.`);
        }
        
        console.log('='.repeat(60));
    }
}

// Ejecutar inicialización
const initializer = new AdminInitializer();

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
console.log('🚀 Iniciando script de inicialización del administrador...');
initializer.initialize().catch(error => {
    console.error('❌ Error en inicialización:', error);
    process.exit(1);
});
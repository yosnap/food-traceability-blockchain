#!/usr/bin/env node

/**
 * Script de prueba rápida para Fabric Gateway API
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🚀 Iniciando prueba de Fabric Gateway...');
console.log('📋 Variables de entorno:');
console.log('  - CHANNEL_NAME:', process.env.CHANNEL_NAME);
console.log('  - CHAINCODE_NAME:', process.env.CHAINCODE_NAME);
console.log('  - FABRIC_NETWORK_PATH:', process.env.FABRIC_NETWORK_PATH);

// Importar servicio compilado
async function testGateway() {
    try {
        // Importar dinámicamente
        const { fabricGatewayService } = await import('./dist/services/FabricGatewayService.js');
        
        console.log('✅ Servicio importado exitosamente');
        
        // Inicializar
        console.log('🔧 Inicializando Gateway...');
        await fabricGatewayService.initialize();
        console.log('✅ Gateway inicializado');
        
        // Probar ping
        console.log('🔧 Probando ping...');
        const pingResult = await fabricGatewayService.ping();
        console.log('✅ Ping exitoso:', pingResult);
        
        // Primero registrar el usuario productor
        console.log('🔧 Registrando usuario productor...');
        const producerAddress = '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A'; // dirección blockchain válida
        const registerResult = await fabricGatewayService.registerUser(
            'Admin@org1.example.com', // admin que registra
            {
                address: producerAddress, // dirección blockchain del productor
                name: 'Juan Pérez',
                role: 'PRODUCER',
                email: 'juan.perez@finca.com',
                phone: '+57 300 123 4567',
                locationData: JSON.stringify({
                    address: 'Vereda San José',
                    city: 'Medellín',
                    state: 'Antioquia',
                    country: 'Colombia',
                    postalCode: '050001'
                }),
                licenseNumber: 'PROD-2025-001'
            }
        );
        console.log('✅ Usuario registrado:', registerResult);

        // Probar creación de producto con usuario específico
        console.log('🔧 Probando creación de producto...');
        const productResult = await fabricGatewayService.createFoodAsset(
            'User1@org1.example.com', // identity que firma (Fabric)
            // pero el chaincode internamente usará producerAddress como currentOwner
            {
                id: `TEST_${Date.now()}`,
                batchNumber: `BATCH_${Date.now()}`,
                name: 'Producto de Prueba Gateway',
                category: 'FRUITS',
                description: 'Producto creado con nuevo Gateway API',
                quantity: 50,
                productionDate: new Date().toISOString(),
                expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                originData: JSON.stringify({
                    producer: 'Juan Pérez',
                    farm: 'Finca Gateway',
                    location: { 
                        address: 'Vereda San José, Finca Gateway',
                        city: 'Medellín',
                        state: 'Antioquia',
                        country: 'Colombia',
                        postalCode: '050001'
                    },
                    harvestDate: new Date().toISOString(),
                    certifications: ['ORGANIC'],
                    lotNumber: 'LOT2025001'
                }),
                storageConditionsData: JSON.stringify({
                    temperature: '4°C',
                    humidity: '80%'
                }),
                allergens: JSON.stringify([])
            }
        );
        console.log('✅ Producto creado:', productResult);
        
        console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
        console.log('');
        console.log('📋 Resumen:');
        console.log('  ✅ Fabric Gateway API funcionando');
        console.log('  ✅ Ping respondiendo correctamente');
        console.log('  ✅ Usuarios pueden firmar transacciones dinámicamente');
        console.log('  ✅ Creación de productos funcional');
        
    } catch (error) {
        console.error('❌ Error en pruebas:', error.message);
        console.error('📋 Stack trace:', error.stack);
    } finally {
        // Desconectar
        try {
            const { fabricGatewayService } = await import('./dist/services/FabricGatewayService.js');
            await fabricGatewayService.disconnect();
            console.log('📡 Desconectado de Gateway');
        } catch (e) {
            console.error('❌ Error desconectando:', e.message);
        }
        
        process.exit(0);
    }
}

// Ejecutar pruebas
testGateway();
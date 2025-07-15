#!/usr/bin/env node

/**
 * Script para probar la autenticación del productor
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testProducerAuth() {
  console.log('🔍 Probando autenticación del productor...\n');
  
  try {
    // Direcciones de productores
    const producers = [
      {
        address: '0x844188335Cc64f65B5aA2490E9C1ddC133811e14',
        name: 'Finca Verde Esperanza'
      },
      {
        address: '0xA8e7E90d5f7aF7407A08f3EdfE7AF09aCB284ECD',
        name: 'Granja Orgánica del Valle'
      }
    ];
    
    for (const producer of producers) {
      console.log(`📱 Probando productor: ${producer.name}`);
      console.log(`🔑 Dirección: ${producer.address}`);
      
      const token = `wallet:${producer.address}`;
      console.log(`🎫 Token: ${token}`);
      
      // Test 1: Probar endpoint de productos
      console.log('\n📦 Test 1: Obteniendo productos del productor');
      const { stdout: productsData } = await execAsync(`curl -s "http://localhost:3001/api/food/products" -H "Authorization: Bearer ${token}"`);
      
      try {
        const products = JSON.parse(productsData);
        
        if (products.success) {
          console.log(`✅ Productos obtenidos: ${products.data.length}`);
          console.log(`✅ Propietario: ${products.owner?.name || 'N/A'}`);
          console.log(`✅ Rol: ${products.owner?.role || 'N/A'}`);
        } else {
          console.log(`❌ Error: ${products.error?.message || products.message}`);
        }
      } catch (parseError) {
        console.log(`❌ Error parsing JSON: ${parseError.message}`);
        console.log(`Raw response: ${productsData.substring(0, 200)}...`);
      }
      
      // Test 2: Probar creación de producto
      console.log('\n📝 Test 2: Probando creación de producto');
      const testProduct = {
        name: `Producto Test ${Date.now()}`,
        category: 'FRESH',
        quantity: 10,
        productionDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Producto de prueba'
      };
      
      const createCmd = `curl -s "http://localhost:3001/api/food/products" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -X POST -d '${JSON.stringify(testProduct)}'`;
      
      try {
        const { stdout: createData } = await execAsync(createCmd);
        const createResult = JSON.parse(createData);
        
        if (createResult.success) {
          console.log(`✅ Producto creado: ${createResult.data.id}`);
        } else {
          console.log(`❌ Error creando producto: ${createResult.error?.message || createResult.message}`);
        }
      } catch (createError) {
        console.log(`❌ Error en creación: ${createError.message}`);
      }
      
      console.log('\n' + '─'.repeat(50) + '\n');
    }
    
    // Test 3: Verificar que otros roles no funcionen
    console.log('🔐 Test 3: Verificando que tokens inválidos no funcionen');
    const invalidTokens = [
      'invalid-token',
      'wallet:0x1234567890123456789012345678901234567890',
      'bearer-token-123',
      ''
    ];
    
    for (const invalidToken of invalidTokens) {
      const { stdout: invalidData } = await execAsync(`curl -s "http://localhost:3001/api/food/products" -H "Authorization: Bearer ${invalidToken}"`);
      
      try {
        const invalidResult = JSON.parse(invalidData);
        if (!invalidResult.success) {
          console.log(`✅ Token inválido rechazado correctamente: ${invalidToken || 'empty'}`);
        } else {
          console.log(`❌ Token inválido aceptado: ${invalidToken}`);
        }
      } catch (error) {
        console.log(`✅ Token inválido rechazado: ${invalidToken || 'empty'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testProducerAuth()
    .then(() => {
      console.log('\n🏁 Pruebas de autenticación completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testProducerAuth };
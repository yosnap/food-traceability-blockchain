#!/usr/bin/env node

/**
 * Script para verificar que el dashboard de admin funciona correctamente
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testDashboard() {
  console.log('🔍 Verificando dashboard de administrador...\n');
  
  try {
    // Test 1: Verificar que el frontend carga
    console.log('📱 Test 1: Frontend cargando correctamente');
    const { stdout: frontendResponse } = await execAsync('curl -s http://localhost:3000/admin');
    const hasError = frontendResponse.includes('error') || frontendResponse.includes('404');
    
    if (hasError) {
      console.log('❌ Frontend tiene errores');
    } else {
      console.log('✅ Frontend carga sin errores');
    }
    
    // Test 2: Verificar API con token correcto
    console.log('\n📡 Test 2: Verificando API con token correcto');
    const ADMIN_TOKEN = 'wallet:0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
    
    const { stdout: apiResponse } = await execAsync(`curl -s "http://localhost:3001/api/food/products/all" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
    const apiData = JSON.parse(apiResponse);
    
    if (apiData.success) {
      console.log(`✅ API funciona correctamente - ${apiData.count} productos encontrados`);
      
      // Test 3: Verificar datos de productos
      console.log('\n📊 Test 3: Analizando datos de productos');
      const products = apiData.data || [];
      
      let productsWithTransfers = 0;
      let totalTransfers = 0;
      let uniqueOwners = new Set();
      let productsNearExpiration = 0;
      
      const today = new Date();
      
      products.forEach(product => {
        // Contar propietarios únicos
        if (product.owner) {
          uniqueOwners.add(product.owner);
        }
        
        // Contar transferencias
        if (product.transferHistory && product.transferHistory.length > 0) {
          productsWithTransfers++;
          totalTransfers += product.transferHistory.length;
        }
        
        // Contar productos próximos a vencer
        const expirationDate = new Date(product.attributes?.expirationDate || product.expirationDate);
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration <= 7 && daysUntilExpiration >= 0) {
          productsNearExpiration++;
        }
      });
      
      console.log(`📊 Estadísticas calculadas:`);
      console.log(`   • Total productos: ${products.length}`);
      console.log(`   • Productos con transferencias: ${productsWithTransfers}`);
      console.log(`   • Total transferencias: ${totalTransfers}`);
      console.log(`   • Usuarios únicos: ${uniqueOwners.size}`);
      console.log(`   • Productos próximos a vencer: ${productsNearExpiration}`);
      
      // Test 4: Verificar endpoint de usuarios
      console.log('\n👥 Test 4: Verificando endpoint de usuarios');
      const { stdout: usersResponse } = await execAsync(`curl -s "http://localhost:3001/api/admin/users/pending-verification" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
      const usersData = JSON.parse(usersResponse);
      
      if (usersData.success) {
        console.log(`✅ Endpoint de usuarios funciona - ${usersData.count} usuarios pendientes`);
      } else {
        console.log(`❌ Error en endpoint de usuarios: ${usersData.error?.message}`);
      }
      
    } else {
      console.log(`❌ Error en API: ${apiData.error?.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testDashboard()
    .then(() => {
      console.log('\n🏁 Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testDashboard };
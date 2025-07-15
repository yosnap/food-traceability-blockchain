#!/usr/bin/env node

/**
 * Script para simular login del administrador y verificar la carga de datos
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuración del administrador
const ADMIN_ADDRESS = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
const ADMIN_TOKEN = `wallet:${ADMIN_ADDRESS}`;
const API_BASE_URL = 'http://localhost:3001/api';

async function testAdminEndpoints() {
  console.log('🔍 Probando endpoints de administrador...\n');
  
  try {
    // Test 1: Verificar productos
    console.log('📦 Test 1: Obteniendo todos los productos del sistema');
    const { stdout: productsData } = await execAsync(`curl -s "${API_BASE_URL}/food/products/all" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
    const products = JSON.parse(productsData);
    
    console.log(`✅ Productos obtenidos: ${products.success ? products.count : 0}`);
    if (products.success) {
      console.log(`   📊 Total productos: ${products.count}`);
      console.log(`   📋 Mensaje: ${products.message}`);
    } else {
      console.log(`   ❌ Error: ${products.error?.message || 'Error desconocido'}`);
    }
    
    // Test 2: Verificar usuarios pendientes
    console.log('\n👥 Test 2: Obteniendo usuarios pendientes de verificación');
    const { stdout: usersData } = await execAsync(`curl -s "${API_BASE_URL}/admin/users/pending-verification" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
    const users = JSON.parse(usersData);
    
    console.log(`✅ Usuarios pendientes: ${users.success ? users.count : 0}`);
    if (users.success) {
      console.log(`   📊 Total usuarios: ${users.count}`);
      console.log(`   📋 Mensaje: ${users.message}`);
    } else {
      console.log(`   ❌ Error: ${users.error?.message || 'Error desconocido'}`);
    }
    
    // Test 3: Verificar estadísticas del sistema
    console.log('\n📊 Test 3: Obteniendo estadísticas del sistema');
    const { stdout: statsData } = await execAsync(`curl -s "${API_BASE_URL}/admin/stats" -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
    const stats = JSON.parse(statsData);
    
    console.log(`✅ Estadísticas: ${stats.success ? 'Obtenidas' : 'Error'}`);
    if (stats.success) {
      console.log(`   📊 Datos: ${JSON.stringify(stats.data)}`);
    } else {
      console.log(`   ❌ Error: ${stats.error?.message || 'Error desconocido'}`);
    }
    
    // Test 4: Verificar transferencias (usando productos)
    console.log('\n🔄 Test 4: Analizando transferencias en productos');
    if (products.success && products.data && products.data.length > 0) {
      let totalTransfers = 0;
      let productsWithTransfers = 0;
      
      products.data.forEach(product => {
        if (product.transferHistory && product.transferHistory.length > 0) {
          productsWithTransfers++;
          totalTransfers += product.transferHistory.length;
        }
      });
      
      console.log(`✅ Transferencias encontradas:`);
      console.log(`   📊 Productos con transferencias: ${productsWithTransfers}`);
      console.log(`   📊 Total transferencias: ${totalTransfers}`);
      console.log(`   📊 Transferencias activas: ${products.data.filter(p => p.owner && p.amount > 0).length}`);
    } else {
      console.log(`   ❌ No se pudieron analizar transferencias`);
    }
    
  } catch (error) {
    console.error('❌ Error en los tests:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testAdminEndpoints()
    .then(() => {
      console.log('\n🏁 Tests completados');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testAdminEndpoints };
#!/usr/bin/env node

/**
 * Script de inicialización con datos de ejemplo para presentación
 * Crea ~50 productos distribuidos entre todos los roles con transferencias realistas
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuración de la API
const API_BASE_URL = 'http://localhost:3001/api';

// Wallets REALES registradas en el sistema
const WALLETS = {
  PRODUCER: [
    { address: '0x844188335Cc64f65B5aA2490E9C1ddC133811e14', name: 'Finca Verde Esperanza' },
    { address: '0xA8e7E90d5f7aF7407A08f3EdfE7AF09aCB284ECD', name: 'Granja Orgánica del Valle' }
  ],
  PROCESSOR: [
    { address: '0x6F580F65469dC6C67a5668377132480D376Ddb06', name: 'Procesadora Valle Verde' }
  ],
  DISTRIBUTOR: [
    { address: '0x1F2a486F5227fC0CD09B3b2b2F752D50cDdf9878', name: 'Logística Valle Central' }
  ],
  RETAILER: [
    { address: '0x8Dc664D838Ad25E9bF260D9E1E76fC377FA11fF5', name: 'SuperMarket Plus' }
  ]
};

// Tipos de productos para cada categoría
const PRODUCT_TEMPLATES = {
  FRUITS: [
    { name: 'Tomates Cherry Orgánicos', variety: 'Cherry', weight: 0.5, category: 'FRESH' },
    { name: 'Mangos Tommy Atkins', variety: 'Tommy Atkins', weight: 1.2, category: 'FRESH' },
    { name: 'Bananos Premium', variety: 'Cavendish', weight: 2.0, category: 'FRESH' },
    { name: 'Fresas Frescas', variety: 'Albion', weight: 0.3, category: 'FRESH' },
    { name: 'Piñas Golden', variety: 'Golden', weight: 1.8, category: 'FRESH' },
    { name: 'Aguacates Hass', variety: 'Hass', weight: 0.8, category: 'FRESH' },
    { name: 'Naranjas Valencia', variety: 'Valencia', weight: 1.5, category: 'FRESH' }
  ],
  VEGETABLES: [
    { name: 'Lechugas Hidropónicas', variety: 'Iceberg', weight: 0.4, category: 'FRESH' },
    { name: 'Zanahorias Orgánicas', variety: 'Nantes', weight: 0.6, category: 'FRESH' },
    { name: 'Brócoli Fresco', variety: 'Calabrese', weight: 0.5, category: 'FRESH' },
    { name: 'Pepinos Verdes', variety: 'Americano', weight: 0.3, category: 'FRESH' },
    { name: 'Pimientos Rojos', variety: 'California', weight: 0.4, category: 'FRESH' },
    { name: 'Cebollas Dulces', variety: 'Vidalia', weight: 0.8, category: 'FRESH' }
  ],
  PROCESSED: [
    { name: 'Salsa de Tomate Natural', variety: 'Procesado', weight: 0.5, category: 'PROCESSED' },
    { name: 'Jugo de Mango 100%', variety: 'Procesado', weight: 1.0, category: 'PROCESSED' },
    { name: 'Mermelada de Fresa', variety: 'Procesado', weight: 0.3, category: 'PROCESSED' },
    { name: 'Chips de Banano', variety: 'Procesado', weight: 0.2, category: 'PROCESSED' },
    { name: 'Aceite de Aguacate', variety: 'Procesado', weight: 0.5, category: 'PROCESSED' }
  ]
};

// Función para generar ID único
function generateProductId() {
  return `PROD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Función para generar número de lote
function generateBatchNumber(productName) {
  const prefix = productName.split(' ')[0].substring(0, 3).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `${prefix}-${date}-${random}`;
}

// Función para generar fechas realistas
function generateDates() {
  const now = new Date();
  const productionDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Hasta 7 días atrás
  const expirationDate = new Date(now.getTime() + (5 + Math.random() * 25) * 24 * 60 * 60 * 1000); // 5-30 días adelante
  
  return {
    productionDate: productionDate.toISOString(),
    expirationDate: expirationDate.toISOString()
  };
}

// Función para hacer petición HTTP con token de wallet
async function makeRequest(method, endpoint, data, walletAddress) {
  const token = `wallet:${walletAddress}`;
  
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error en ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Función para crear un producto
async function createProduct(producer, template) {
  const dates = generateDates();
  const productId = generateProductId();
  
  const productData = {
    id: productId,
    name: template.name,
    quantity: Math.floor(Math.random() * 50) + 10, // 10-60 unidades
    batchNumber: generateBatchNumber(template.name),
    productionDate: dates.productionDate,
    expirationDate: dates.expirationDate,
    category: template.category,
    variety: template.variety,
    weight: template.weight,
    description: `${template.name} de alta calidad producido por ${producer.name}`,
    brand: producer.name,
    origin: {
      farmName: producer.name,
      location: 'Costa Rica',
      coordinates: { lat: 9.7489, lng: -83.7534 }
    },
    storageConditions: {
      temperature: Math.floor(Math.random() * 10) + 2, // 2-12°C
      humidity: Math.floor(Math.random() * 20) + 70    // 70-90%
    },
    certifications: ['Orgánico', 'HACCP', 'BPA'],
    allergens: [],
    walletAddress: producer.address,
    signature: `signature_${productId}`
  };
  
  console.log(`📦 Creando producto: ${template.name} (${producer.name})`);
  
  const response = await makeRequest('POST', '/food/create', productData, producer.address);
  return { ...productData, response };
}

// Función para transferir producto
async function transferProduct(productId, fromWallet, toWallet, quantity, transferType, deliveryTime = 0) {
  const transferData = {
    newOwner: toWallet.address,
    transferType,
    location: {
      address: toWallet.name,
      city: 'San José',
      country: 'Costa Rica'
    },
    quantity,
    conditions: `Transferencia de ${transferType}`,
    notes: `Transferido a ${toWallet.name}`,
    deliveryTime
  };
  
  console.log(`🔄 Transfiriendo ${quantity} unidades de ${productId} a ${toWallet.name}`);
  
  const response = await makeRequest('POST', `/food/transfer/${productId}`, transferData, fromWallet.address);
  return response;
}

// Función para obtener productos de una wallet
async function getProductsFromWallet(wallet) {
  try {
    const response = await makeRequest('GET', '/food/my-products', null, wallet.address);
    return response.data || [];
  } catch (error) {
    console.log(`⚠️ No se pudieron obtener productos de ${wallet.name}`);
    return [];
  }
}

// Función para esperar un tiempo
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función principal
async function initializeDemoData() {
  console.log('🚀 Iniciando población de datos de ejemplo...\n');
  
  try {
    // Paso 1: Crear productos en productores (20 productos)
    console.log('📋 PASO 1: Creando productos en productores...\n');
    
    const allProducts = [...PRODUCT_TEMPLATES.FRUITS, ...PRODUCT_TEMPLATES.VEGETABLES];
    const createdProducts = [];
    
    for (let i = 0; i < 20; i++) {
      const producer = WALLETS.PRODUCER[i % WALLETS.PRODUCER.length];
      const template = allProducts[i % allProducts.length];
      
      try {
        const product = await createProduct(producer, template);
        createdProducts.push({ ...product, currentOwner: producer });
        await sleep(500); // Esperar 500ms entre creaciones
      } catch (error) {
        console.log(`❌ Error creando producto ${template.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Creados ${createdProducts.length} productos en productores\n`);
    
    // Paso 2: Transferir algunos productos a procesadores (15 productos)
    console.log('📋 PASO 2: Transfiriendo productos a procesadores...\n');
    
    const processedProducts = [];
    for (let i = 0; i < Math.min(15, createdProducts.length); i++) {
      const product = createdProducts[i];
      const processor = WALLETS.PROCESSOR[i % WALLETS.PROCESSOR.length];
      
      try {
        await transferProduct(
          product.id,
          product.currentOwner,
          processor,
          Math.floor(product.quantity * 0.8), // Transferir 80% de la cantidad
          'PROCESSING',
          Math.floor(Math.random() * 4) // 0-4 horas de entrega
        );
        
        processedProducts.push({ ...product, currentOwner: processor });
        await sleep(1000);
      } catch (error) {
        console.log(`❌ Error transfiriendo ${product.name} a procesador: ${error.message}`);
      }
    }
    
    console.log(`✅ Transferidos ${processedProducts.length} productos a procesadores\n`);
    
    // Paso 3: Crear productos procesados (10 productos)
    console.log('📋 PASO 3: Creando productos procesados...\n');
    
    const processedTemplates = PRODUCT_TEMPLATES.PROCESSED;
    for (let i = 0; i < 10; i++) {
      const processor = WALLETS.PROCESSOR[i % WALLETS.PROCESSOR.length];
      const template = processedTemplates[i % processedTemplates.length];
      
      try {
        const product = await createProduct(processor, template);
        processedProducts.push({ ...product, currentOwner: processor });
        await sleep(500);
      } catch (error) {
        console.log(`❌ Error creando producto procesado ${template.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Creados 10 productos procesados\n`);
    
    // Paso 4: Transferir productos a distribuidores (20 productos)
    console.log('📋 PASO 4: Transfiriendo productos a distribuidores...\n');
    
    const distributedProducts = [];
    for (let i = 0; i < Math.min(20, processedProducts.length); i++) {
      const product = processedProducts[i];
      const distributor = WALLETS.DISTRIBUTOR[i % WALLETS.DISTRIBUTOR.length];
      
      try {
        // Obtener productos actuales del propietario
        const currentProducts = await getProductsFromWallet(product.currentOwner);
        const currentProduct = currentProducts.find(p => p.id === product.id);
        
        if (currentProduct && currentProduct.amount > 0) {
          await transferProduct(
            product.id,
            product.currentOwner,
            distributor,
            Math.floor(currentProduct.amount * 0.7), // Transferir 70% de la cantidad actual
            'DISTRIBUTION',
            Math.floor(Math.random() * 8) + 2 // 2-10 horas de entrega
          );
          
          distributedProducts.push({ ...product, currentOwner: distributor });
        }
        
        await sleep(1000);
      } catch (error) {
        console.log(`❌ Error transfiriendo ${product.name} a distribuidor: ${error.message}`);
      }
    }
    
    console.log(`✅ Transferidos ${distributedProducts.length} productos a distribuidores\n`);
    
    // Paso 5: Transferir productos a retailers (15 productos)
    console.log('📋 PASO 5: Transfiriendo productos a retailers...\n');
    
    const retailedProducts = [];
    for (let i = 0; i < Math.min(15, distributedProducts.length); i++) {
      const product = distributedProducts[i];
      const retailer = WALLETS.RETAILER[i % WALLETS.RETAILER.length];
      
      try {
        // Obtener productos actuales del distribuidor
        const currentProducts = await getProductsFromWallet(product.currentOwner);
        const currentProduct = currentProducts.find(p => p.id === product.id);
        
        if (currentProduct && currentProduct.amount > 0) {
          await transferProduct(
            product.id,
            product.currentOwner,
            retailer,
            Math.floor(currentProduct.amount * 0.6), // Transferir 60% de la cantidad actual
            'RETAIL',
            Math.floor(Math.random() * 6) + 1 // 1-6 horas de entrega
          );
          
          retailedProducts.push({ ...product, currentOwner: retailer });
        }
        
        await sleep(1000);
      } catch (error) {
        console.log(`❌ Error transfiriendo ${product.name} a retailer: ${error.message}`);
      }
    }
    
    console.log(`✅ Transferidos ${retailedProducts.length} productos a retailers\n`);
    
    // Paso 6: Simular algunas ventas a consumidores (5 productos)
    console.log('📋 PASO 6: Simulando ventas a consumidores...\n');
    
    const consumerWallet = { address: '0xcA01956A17ABF046b8e7261BF2E6B4F41Ad1FF16', name: 'Consumidor Final' };
    
    for (let i = 0; i < Math.min(5, retailedProducts.length); i++) {
      const product = retailedProducts[i];
      
      try {
        // Obtener productos actuales del retailer
        const currentProducts = await getProductsFromWallet(product.currentOwner);
        const currentProduct = currentProducts.find(p => p.id === product.id);
        
        if (currentProduct && currentProduct.amount > 0) {
          await transferProduct(
            product.id,
            product.currentOwner,
            consumerWallet,
            Math.min(3, currentProduct.amount), // Vender máximo 3 unidades
            'SALE',
            0 // Entrega inmediata
          );
        }
        
        await sleep(1000);
      } catch (error) {
        console.log(`❌ Error vendiendo ${product.name} a consumidor: ${error.message}`);
      }
    }
    
    console.log(`✅ Simuladas ventas a consumidores\n`);
    
    // Resumen final
    console.log('🎉 INICIALIZACIÓN COMPLETA!\n');
    console.log('📊 RESUMEN DE DATOS CREADOS:');
    console.log(`   📦 Productos creados: ~50`);
    console.log(`   👥 Productores: ${WALLETS.PRODUCER.length}`);
    console.log(`   🏭 Procesadores: ${WALLETS.PROCESSOR.length}`);
    console.log(`   🚚 Distribuidores: ${WALLETS.DISTRIBUTOR.length}`);
    console.log(`   🏪 Retailers: ${WALLETS.RETAILER.length}`);
    console.log(`   💳 Wallets únicas: ${Object.values(WALLETS).flat().length}`);
    console.log('\n✨ La plataforma está lista para la presentación!');
    
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initializeDemoData()
    .then(() => {
      console.log('\n🏁 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { initializeDemoData };
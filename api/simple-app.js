/**
 * API simplificada siguiendo el patrón del repositorio de referencia
 * Basada en: https://github.com/codecrypto-academy/pfm-traza-hlf-2025
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { connectFabric } = require('./hlf-simple');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

/**
 * Ping básico al chaincode
 */
app.get('/ping', async (req, res) => {
    try {
        const { gateway, contract } = await connectFabric();
        const result = await contract.submitTransaction('ping');
        const response = new TextDecoder().decode(result);
        
        res.json({
            success: true,
            result: response,
            timestamp: new Date().toISOString()
        });
        
        gateway.close();
    } catch (error) {
        console.error('Error en ping:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Crear producto simple
 */
app.post('/createProduct', async (req, res) => {
    try {
        const { name, category, quantity, productionDate, expirationDate } = req.body;
        
        const { gateway, contract } = await connectFabric();
        
        // Generar ID simple
        const productId = `PROD_${Date.now()}`;
        
        const result = await contract.submitTransaction(
            'createFoodAsset',
            productId,
            `BATCH_${Date.now()}`,
            name,
            category,
            name, // description
            quantity.toString(),
            productionDate,
            expirationDate,
            JSON.stringify({
                producer: 'Default Producer',
                farm: 'Default Farm',
                location: {
                    address: 'Default Address',
                    city: 'Default City',
                    country: 'España'
                }
            }),
            JSON.stringify({
                temperature: '4°C',
                humidity: '80%'
            }),
            JSON.stringify([])
        );
        
        const response = new TextDecoder().decode(result);
        
        res.json({
            success: true,
            productId: productId,
            result: response,
            timestamp: new Date().toISOString()
        });
        
        gateway.close();
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Obtener producto por ID
 */
app.get('/product/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { gateway, contract } = await connectFabric();
        const result = await contract.evaluateTransaction('getFoodAsset', id);
        const response = new TextDecoder().decode(result);
        
        res.json({
            success: true,
            product: JSON.parse(response),
            timestamp: new Date().toISOString()
        });
        
        gateway.close();
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Listar productos por owner
 */
app.get('/products/owner/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const { gateway, contract } = await connectFabric();
        const result = await contract.evaluateTransaction('getProductsByOwner', address);
        const response = new TextDecoder().decode(result);
        
        res.json({
            success: true,
            products: JSON.parse(response),
            timestamp: new Date().toISOString()
        });
        
        gateway.close();
    } catch (error) {
        console.error('Error listando productos:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Puerto
const PORT = process.env.PORT || 5551;

app.listen(PORT, () => {
    console.log(`🚀 API simplificada funcionando en puerto ${PORT}`);
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET  http://localhost:${PORT}/ping`);
    console.log(`   POST http://localhost:${PORT}/createProduct`);
    console.log(`   GET  http://localhost:${PORT}/product/:id`);
    console.log(`   GET  http://localhost:${PORT}/products/owner/:address`);
});

module.exports = app;
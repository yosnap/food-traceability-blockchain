/**
 * Servidor mínimo para crear productos en el blockchain
 */

import express from 'express';
import cors from 'cors';
import { fabricGatewayService } from './dist/services/FabricGatewayService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Inicializar Fabric Gateway
try {
    await fabricGatewayService.initialize();
    
    // Agregar función getAllProducts si no existe
    if (!fabricGatewayService.getAllProducts) {
        fabricGatewayService.getAllProducts = async function() {
            try {
                const result = await this.evaluateTransactionAsUser(
                    'admin',
                    'admin',
                    'food',
                    'getAllProducts'
                );
                const products = JSON.parse(result);
                console.log(`✅ Obtenidos ${products.length} productos del blockchain`);
                return products;
            } catch (error) {
                console.error('❌ Error obteniendo todos los productos:', error.message);
                return [];
            }
        };
    }
    
    console.log('✅ FabricGatewayService inicializado');
} catch (error) {
    console.error('❌ Error inicializando FabricGatewayService:', error.message);
}

// Auth middleware simple
const simpleAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Detectar si es un token de MetaMask
        if (token.startsWith('metamask_')) {
            const parts = token.split('_');
            if (parts.length >= 2) {
                const address = parts[1];
                req.user = {
                    address: address,
                    role: 'PRODUCER', // Por defecto, podríamos extraer esto del token
                    name: `MetaMask User (${address.slice(0, 6)}...${address.slice(-4)})`,
                    provider: 'metamask'
                };
            } else {
                req.user = {
                    address: '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A',
                    role: 'PRODUCER',
                    name: 'User1 (Producer)',
                    provider: 'predefined'
                };
            }
        } else {
            // Token predefinido
            req.user = {
                address: '0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A',
                role: 'PRODUCER',
                name: 'User1 (Producer)',
                provider: 'predefined'
            };
        }
        next();
    } else {
        res.status(401).json({ success: false, message: 'Token requerido' });
    }
};

// Rutas
app.get('/api/health', async (req, res) => {
    try {
        const pingResult = await fabricGatewayService.ping();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            fabric: { status: 'connected', ping: pingResult }
        });
    } catch (error) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            fabric: { status: 'error', error: error.message }
        });
    }
});

app.get('/api/food/ping', simpleAuth, async (req, res) => {
    try {
        const result = await fabricGatewayService.ping();
        res.json({
            success: true,
            message: 'Conexión con chaincode exitosa',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error conectando con chaincode',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/food/products', simpleAuth, async (req, res) => {
    try {
        console.log('🔧 Creando producto con datos:', req.body);
        
        // Validar campos requeridos
        const { name, category, quantity, productionDate, expirationDate } = req.body;
        if (!name || !category || !quantity || !productionDate || !expirationDate) {
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: name, category, quantity, productionDate, expirationDate'
            });
        }

        // Generar ID único si no se proporciona
        const productId = req.body.id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Preparar datos del producto
        const productData = {
            id: productId,
            name,
            quantity: parseInt(quantity),
            ...req.body
        };

        console.log('📝 Datos del producto preparados:', {
            id: productData.id,
            name: productData.name,
            quantity: productData.quantity
        });

        // Crear producto usando FabricGatewayService
        const result = await fabricGatewayService.createFoodAsset(
            'User1@org1.example.com', // producerUserId
            productData
        );

        console.log('✅ Producto creado exitosamente:', result);

        res.json({
            success: true,
            message: 'Producto creado exitosamente',
            productId: productData.id,
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error creando producto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error creando producto',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/food/products', simpleAuth, async (req, res) => {
    try {
        console.log('📋 Obteniendo todos los productos del blockchain...');
        
        // Obtener productos reales del blockchain
        const products = await fabricGatewayService.getAllProducts();
        
        console.log(`✅ Se encontraron ${products.length} productos en el blockchain`);
        
        res.json({
            success: true,
            data: products,
            count: products.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo productos',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Transferir producto (TokenizarContract - simple)
app.post('/api/food/transfer-token', simpleAuth, async (req, res) => {
    try {
        console.log('🔄 Transfiriendo token con datos:', req.body);
        
        const { tokenId, to, amount, signature } = req.body;
        
        // Validar campos requeridos
        if (!tokenId || !to || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: tokenId, to, amount'
            });
        }

        // Ejecutar transferencia
        const result = await fabricGatewayService.transferToken(
            'User1@org1.example.com', // Usuario actual (simulado)
            'producer', // Role actual (simulado)
            {
                tokenId,
                to,
                amount: parseInt(amount),
                signature
            }
        );

        console.log('✅ Token transferido exitosamente:', result);

        res.json({
            success: true,
            message: 'Token transferido exitosamente',
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error transfiriendo token:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error transfiriendo token',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Transferir producto (FoodTraceabilityContract - avanzado)
app.post('/api/food/transfer-asset', simpleAuth, async (req, res) => {
    try {
        console.log('🔄 Transfiriendo asset con datos:', req.body);
        
        const { assetId, newOwner, transferType, locationData, quantity, price, conditions, notes } = req.body;
        
        // Validar campos requeridos
        if (!assetId || !newOwner || !transferType || !locationData) {
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: assetId, newOwner, transferType, locationData'
            });
        }

        // Ejecutar transferencia
        const result = await fabricGatewayService.transferFoodAsset(
            'User1@org1.example.com', // Usuario actual (simulado)
            'producer', // Role actual (simulado)
            {
                assetId,
                newOwner,
                transferType,
                locationData,
                quantity: quantity ? parseInt(quantity) : undefined,
                price: price ? parseFloat(price) : undefined,
                conditions,
                notes
            }
        );

        console.log('✅ Asset transferido exitosamente:', result);

        res.json({
            success: true,
            message: 'Asset transferido exitosamente',
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error transfiriendo asset:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error transfiriendo asset',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Error del servidor:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.originalUrl} no encontrada`,
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor mínimo iniciado');
    console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
/**
 * Rutas de prueba para demostrar firmas dinámicas por usuarios
 */

import { Router, Request, Response } from 'express';
import { fabricGatewayService } from '../services/FabricGatewayService.js';
import { createTestToken, devModeAuth } from '../middleware/roleAuthMiddleware.js';
import fabricUtils from '../utils/fabricUtils.js';

const router = Router();

/**
 * Ruta de ping simple
 */
router.get('/ping', async (req: Request, res: Response) => {
    try {
        const result = await fabricGatewayService.ping();
        
        res.json({
            success: true,
            message: 'Ping exitoso',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error en ping',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Inicializar ledger
 */
router.post('/init-ledger', async (req: Request, res: Response) => {
    try {
        const result = await fabricGatewayService.submitTransactionAsUser(
            'admin',
            'admin',
            'food',
            'initLedger'
        );
        
        res.json({
            success: true,
            message: 'Ledger inicializado',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error inicializando ledger',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Crear producto simple para testing
 */
router.post('/simple-product', async (req: Request, res: Response) => {
    try {
        const { name, category, quantity } = req.body;
        
        const productId = `TEST_${Date.now()}`;
        const batchNumber = `BATCH_${Date.now()}`;
        
        const result = await fabricGatewayService.submitTransactionAsUser(
            'testuser',
            'producer',
            'food',
            'createFoodAsset',
            productId,
            batchNumber,
            name || 'Producto Test',
            category || 'FRUITS',
            'Producto de prueba',
            (quantity || 10).toString(),
            new Date().toISOString(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
            JSON.stringify({
                producer: 'Test Producer',
                farm: 'Test Farm',
                location: { address: 'Test', city: 'Test', country: 'Test' }
            }),
            JSON.stringify({ temperature: '4°C', humidity: '80%' }),
            JSON.stringify([])
        );
        
        res.json({
            success: true,
            message: 'Producto test creado',
            productId,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error creando producto test',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Ruta para generar tokens de prueba
 */
router.post('/auth/generate-token', (req: Request, res: Response): void => {
    try {
        const { userId, role, name } = req.body;
        
        if (!userId || !role) {
            res.status(400).json({
                success: false,
                message: 'userId y role son requeridos'
            });
            return;
        }

        const token = createTestToken({
            userId,
            role,
            address: `${userId}-address`,
            name: name || `Usuario ${userId}`
        });

        res.json({
            success: true,
            message: 'Token generado exitosamente',
            token,
            user: {
                userId,
                role,
                address: `${userId}-address`,
                name: name || `Usuario ${userId}`
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error generando token',
            error: error.message
        });
    }
});

/**
 * Ruta para probar creación de productos con diferentes usuarios
 */
router.post('/products/create-as-user', devModeAuth, async (req: Request, res: Response) => {
    try {
        const { producerUserId, productData } = req.body;
        
        if (!producerUserId || !productData) {
            return res.status(400).json({
                success: false,
                message: 'producerUserId y productData son requeridos'
            });
        }

        console.log(`🔧 Creando producto como usuario: ${producerUserId}`);

        // Usar el nuevo servicio que permite firma por usuario específico
        const result = await fabricGatewayService.createFoodAsset(
            producerUserId,
            {
                id: productData.id || `PROD_${Date.now()}`,
                batchNumber: productData.batchNumber || `BATCH_${Date.now()}`,
                name: productData.name || 'Producto de Prueba',
                category: productData.category || 'FRUITS',
                description: productData.description || 'Producto creado para pruebas',
                quantity: productData.quantity || 100,
                productionDate: productData.productionDate || new Date().toISOString(),
                expirationDate: productData.expirationDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                originData: productData.originData || JSON.stringify({
                    farm: 'Finca de Prueba',
                    location: { country: 'Colombia', region: 'Antioquia' }
                }),
                storageConditionsData: productData.storageConditionsData || JSON.stringify({
                    temperature: '4°C',
                    humidity: '80%'
                }),
                allergens: productData.allergens || JSON.stringify([]),
                weight: productData.weight,
                volume: productData.volume,
                brand: productData.brand
            }
        );

        res.json({
            success: true,
            message: 'Producto creado exitosamente',
            result,
            signedBy: producerUserId,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error creando producto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error creando producto',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Ruta para probar transferencias con diferentes usuarios
 */
router.post('/products/transfer-as-user', devModeAuth, async (req: Request, res: Response) => {
    try {
        const { 
            currentOwnerUserId, 
            currentOwnerRole, 
            assetId, 
            newOwner, 
            transferType 
        } = req.body;
        
        if (!currentOwnerUserId || !currentOwnerRole || !assetId || !newOwner || !transferType) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos: currentOwnerUserId, currentOwnerRole, assetId, newOwner, transferType'
            });
        }

        console.log(`🔧 Transfiriendo producto ${assetId} como usuario: ${currentOwnerUserId} (${currentOwnerRole})`);

        // Usar el nuevo servicio que permite firma por usuario específico
        const result = await fabricGatewayService.transferFoodAsset(
            currentOwnerUserId,
            currentOwnerRole,
            {
                assetId,
                newOwner,
                transferType,
                locationData: JSON.stringify({
                    address: 'Ubicación de transferencia',
                    city: 'Medellín',
                    country: 'Colombia'
                }),
                conditions: 'Buenas condiciones',
                notes: `Transferencia firmada por ${currentOwnerUserId}`
            }
        );

        res.json({
            success: true,
            message: 'Producto transferido exitosamente',
            result,
            signedBy: `${currentOwnerUserId} (${currentOwnerRole})`,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error transfiriendo producto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error transfiriendo producto',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Ruta para obtener información de certificados
 */
router.get('/fabric/certificates', async (req: Request, res: Response) => {
    try {
        const networkPath = process.env.FABRIC_NETWORK_PATH || '../fabric-samples/test-network';
        
        // Obtener estadísticas de certificados
        const stats = await fabricUtils.getCertificateStats(networkPath);
        
        res.json({
            success: true,
            message: 'Estadísticas de certificados',
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error obteniendo información de certificados',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Ruta para verificar certificado de un usuario específico
 */
router.get('/fabric/certificates/:userId/:role', async (req: Request, res: Response) => {
    try {
        const { userId, role } = req.params;
        const networkPath = process.env.FABRIC_NETWORK_PATH || '../fabric-samples/test-network';
        
        // Verificar certificado del usuario
        const certInfo = await fabricUtils.checkUserCertificate(networkPath, userId, role);
        
        res.json({
            success: true,
            message: 'Información de certificado',
            data: certInfo,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error verificando certificado',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Ruta para demostrar múltiples usuarios firmando
 */
router.post('/demo/multi-user-scenario', devModeAuth, async (req: Request, res: Response) => {
    try {
        const results = [];

        // 1. Productor crea un producto
        console.log('🔧 Paso 1: Productor crea producto...');
        const productId = `DEMO_${Date.now()}`;
        const createResult = await fabricGatewayService.createFoodAsset(
            'productor001',
            {
                id: productId,
                batchNumber: `BATCH_${Date.now()}`,
                name: 'Manzanas Demo',
                category: 'FRUITS',
                description: 'Manzanas para demostración de firmas múltiples',
                quantity: 100,
                productionDate: new Date().toISOString(),
                expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                originData: JSON.stringify({
                    farm: 'Finca Demo',
                    location: { country: 'Colombia', region: 'Antioquia' }
                }),
                storageConditionsData: JSON.stringify({
                    temperature: '4°C',
                    humidity: '80%'
                }),
                allergens: JSON.stringify([])
            }
        );

        results.push({
            step: 1,
            action: 'Crear producto',
            signedBy: 'productor001 (producer)',
            result: createResult
        });

        // 2. Transferir a procesador
        console.log('🔧 Paso 2: Transferir a procesador...');
        const transferResult1 = await fabricGatewayService.transferFoodAsset(
            'productor001',
            'producer',
            {
                assetId: productId,
                newOwner: 'procesador001',
                transferType: 'HARVEST_TO_PROCESSOR',
                locationData: JSON.stringify({
                    address: 'Planta de Procesamiento',
                    city: 'Medellín'
                }),
                notes: 'Transferencia firmada por productor'
            }
        );

        results.push({
            step: 2,
            action: 'Transferir a procesador',
            signedBy: 'productor001 (producer)',
            result: transferResult1
        });

        // 3. Procesador transfiere a distribuidor
        console.log('🔧 Paso 3: Procesador transfiere a distribuidor...');
        const transferResult2 = await fabricGatewayService.transferFoodAsset(
            'procesador001',
            'processor',
            {
                assetId: productId,
                newOwner: 'distribuidor001',
                transferType: 'PROCESS_TO_DISTRIBUTOR',
                locationData: JSON.stringify({
                    address: 'Centro de Distribución',
                    city: 'Bogotá'
                }),
                notes: 'Transferencia firmada por procesador'
            }
        );

        results.push({
            step: 3,
            action: 'Transferir a distribuidor',
            signedBy: 'procesador001 (processor)',
            result: transferResult2
        });

        // 4. Obtener información final del producto
        console.log('🔧 Paso 4: Obtener información del producto...');
        const finalProduct = await fabricGatewayService.getFoodAsset(productId);

        results.push({
            step: 4,
            action: 'Consultar producto final',
            signedBy: 'admin (admin)',
            result: 'Producto consultado exitosamente',
            productData: finalProduct
        });

        res.json({
            success: true,
            message: 'Demostración de múltiples usuarios completada',
            productId,
            totalSteps: results.length,
            results,
            summary: {
                signatures: [
                    'productor001 firmó la creación',
                    'productor001 firmó transferencia a procesador',
                    'procesador001 firmó transferencia a distribuidor'
                ],
                currentOwner: finalProduct.currentOwner,
                ownershipHistory: finalProduct.ownershipHistory
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error en demostración:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en demostración de múltiples usuarios',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
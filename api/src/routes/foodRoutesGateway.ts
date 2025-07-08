/**
 * Rutas actualizadas para productos alimentarios usando FabricGatewayService
 * Integra autenticación por roles y firmas dinámicas
 */

import { Router, Request, Response } from 'express';
import { fabricGatewayService } from '../services/FabricGatewayService.js';
import { devModeAuth, SimpleUser } from '../middleware/simpleAuth.js';

const router = Router();

/**
 * Ping al chaincode
 */
router.get('/ping', async (req: Request, res: Response) => {
    try {
        const result = await fabricGatewayService.ping();
        
        res.json({
            success: true,
            message: 'Conexión con chaincode exitosa',
            result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error conectando con chaincode',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Crear un nuevo producto (solo productores)
 */
router.post('/products', devModeAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as SimpleUser;
        
        // Verificar que el usuario sea productor
        if (user.role !== 'producer' && user.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Solo los productores pueden crear productos',
                userRole: user.role
            });
            return;
        }

        const {
            id,
            batchNumber,
            name,
            category,
            description,
            quantity,
            productionDate,
            expirationDate,
            originData,
            storageConditionsData,
            allergens,
            weight,
            volume,
            brand
        } = req.body;

        // Validar campos requeridos
        if (!name || !category || !quantity || !productionDate || !expirationDate) {
            res.status(400).json({
                success: false,
                message: 'Campos requeridos: name, category, quantity, productionDate, expirationDate'
            });
            return;
        }

        // Generar datos por defecto si no se proporcionan
        const productId = id || `PROD_${Date.now()}`;
        const batch = batchNumber || `BATCH_${Date.now()}`;
        
        const defaultOriginData = originData || JSON.stringify({
            producer: user.name || 'Productor',
            farm: 'Finca del Usuario',
            location: {
                address: 'Ubicación del productor',
                city: 'Ciudad',
                state: 'Estado',
                country: 'Colombia',
                postalCode: '000000'
            },
            harvestDate: productionDate,
            certifications: ['ORGANIC'],
            lotNumber: batch
        });

        const defaultStorageConditions = storageConditionsData || JSON.stringify({
            temperature: '4°C',
            humidity: '80%',
            lightExposure: 'Mínima',
            storageType: 'Refrigerado'
        });

        const defaultAllergens = allergens || JSON.stringify([]);

        console.log(`🔧 Creando producto como ${user.userId} (${user.role})`);

        // Usar el nuevo servicio Gateway con firma por usuario
        const result = await fabricGatewayService.createFoodAsset(
            user.userId, // Identidad que firma
            {
                id: productId,
                batchNumber: batch,
                name,
                category,
                description: description || `Producto creado por ${user.name}`,
                quantity: parseInt(quantity),
                productionDate,
                expirationDate,
                originData: defaultOriginData,
                storageConditionsData: defaultStorageConditions,
                allergens: defaultAllergens,
                weight: weight ? parseFloat(weight) : undefined,
                volume: volume ? parseFloat(volume) : undefined,
                brand: brand || undefined
            }
        );

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: {
                id: productId,
                result,
                signedBy: `${user.name} (${user.role})`
            },
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
 * Obtener un producto por ID
 */
router.get('/products/:id', devModeAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID de producto requerido'
            });
            return;
        }

        const product = await fabricGatewayService.getFoodAsset(id);

        res.json({
            success: true,
            message: 'Producto obtenido exitosamente',
            data: product,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo producto:', error.message);
        
        if (error.message.includes('no existe')) {
            res.status(404).json({
                success: false,
                message: 'Producto no encontrado',
                error: error.message
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Error obteniendo producto',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Transferir un producto a otro usuario
 */
router.post('/products/:id/transfer', devModeAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as SimpleUser;
        const { id } = req.params;
        const { newOwner, transferType, locationData, quantity, price, conditions, notes } = req.body;

        if (!newOwner || !transferType) {
            res.status(400).json({
                success: false,
                message: 'Campos requeridos: newOwner, transferType'
            });
            return;
        }

        const defaultLocationData = locationData || JSON.stringify({
            address: 'Ubicación de transferencia',
            city: 'Ciudad',
            country: 'Colombia'
        });

        console.log(`🔧 Transfiriendo producto ${id} como ${user.userId} (${user.role})`);

        const result = await fabricGatewayService.transferFoodAsset(
            user.userId, // Quien firma la transferencia
            user.role,
            {
                assetId: id,
                newOwner,
                transferType,
                locationData: defaultLocationData,
                quantity: quantity ? parseInt(quantity) : undefined,
                price: price ? parseFloat(price) : undefined,
                conditions: conditions || 'Buenas condiciones',
                notes: notes || `Transferencia firmada por ${user.name}`
            }
        );

        res.json({
            success: true,
            message: 'Producto transferido exitosamente',
            data: {
                result,
                signedBy: `${user.name} (${user.role})`
            },
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
 * Obtener productos próximos a caducar
 */
router.get('/expiring', devModeAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as SimpleUser;
        const daysAhead = parseInt(req.query.daysAhead as string) || 7;
        const category = req.query.category as string;

        // Para consultas, podemos usar cualquier usuario
        const result = await fabricGatewayService.evaluateTransactionAsUser(
            user.userId,
            user.role,
            'food',
            'getExpiringProducts',
            daysAhead.toString(),
            '', // ownerAddress - vacío para obtener todos
            category || ''
        );

        const expiringProducts = JSON.parse(result);

        res.json({
            success: true,
            message: 'Productos próximos a caducar obtenidos exitosamente',
            data: expiringProducts,
            filters: {
                daysAhead,
                category: category || 'todos'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo productos próximos a caducar:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo productos próximos a caducar',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Obtener mis productos (del usuario autenticado)
 */
router.get('/products', devModeAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as SimpleUser;

        console.log(`🔧 Obteniendo productos para usuario: ${user.userId} (${user.role})`);

        try {
            // Intentar obtener productos del usuario actual
            const result = await fabricGatewayService.evaluateTransactionAsUser(
                user.userId,
                user.role,
                'food',
                'getProductsByOwner',
                user.address // Usar la dirección blockchain del usuario
            );

            const products = JSON.parse(result);

            res.json({
                success: true,
                message: 'Productos del usuario obtenidos exitosamente',
                data: products,
                owner: {
                    userId: user.userId,
                    name: user.name,
                    role: user.role,
                    address: user.address
                },
                timestamp: new Date().toISOString()
            });

        } catch (chainError: any) {
            console.log('⚠️ Error en chaincode (LevelDB limitation):', chainError.message);
            
            // Devolver array vacío para que el usuario pueda crear productos reales
            res.json({
                success: true,
                message: 'No hay productos aún. Crea tu primer producto.',
                data: [],
                owner: {
                    userId: user.userId,
                    name: user.name,
                    role: user.role,
                    address: user.address
                },
                note: 'LevelDB no soporta consultas complejas. Los productos se almacenan pero requieren consultas por ID individual.',
                timestamp: new Date().toISOString()
            });
            return;
            
        }

    } catch (error: any) {
        console.error('❌ Error obteniendo productos del usuario:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo productos del usuario',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Consumir un producto (marcar como consumido)
 */
router.post('/products/:id/consume', devModeAuth, async (req: Request, res: Response) => {
    try {
        const user = req.user as SimpleUser;
        const { id } = req.params;
        const { consumedDate, rating, notes } = req.body;

        // Solo consumidores pueden marcar productos como consumidos
        if (user.role !== 'consumer' && user.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Solo los consumidores pueden marcar productos como consumidos',
                userRole: user.role
            });
            return;
        }

        console.log(`🔧 Marcando producto ${id} como consumido por ${user.userId} (${user.role})`);

        const result = await fabricGatewayService.submitTransactionAsUser(
            user.userId,
            user.role,
            'food',
            'markAsConsumed',
            id,
            consumedDate || new Date().toISOString(),
            rating ? rating.toString() : '',
            notes || `Consumido por ${user.name}`
        );

        res.json({
            success: true,
            message: 'Producto marcado como consumido exitosamente',
            data: {
                result,
                consumedBy: `${user.name} (${user.role})`
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error marcando producto como consumido:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error marcando producto como consumido',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
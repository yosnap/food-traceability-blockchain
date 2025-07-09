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
router.post('/products', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const normalizedRole = user.role.toLowerCase();
        const userId = normalizedRole === 'producer' || normalizedRole === 'admin' 
            ? 'User1@org1.example.com' 
            : 'User1@org2.example.com';
        
        // Verificar que el usuario sea productor
        if (normalizedRole !== 'producer' && normalizedRole !== 'admin') {
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

        console.log(`🔧 Creando producto como ${userId} (${normalizedRole})`);

        // Usar el nuevo servicio Gateway con firma por usuario
        const result = await fabricGatewayService.createFoodAsset(
            userId, // Identidad que firma
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
            },
            user.address // Usar la dirección real del usuario autenticado
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
router.get('/products/:id', async (req: Request, res: Response) => {
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
router.post('/products/:id/transfer', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

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

        // Mapear el rol del authMiddleware al formato interno para Fabric
        const normalizedRole = user.role.toLowerCase();
        const userId = normalizedRole === 'producer' || normalizedRole === 'admin' 
            ? 'User1@org1.example.com' 
            : 'User1@org2.example.com';

        console.log(`🔧 Transfiriendo producto ${id} como ${userId} (${user.role})`);

        const result = await fabricGatewayService.transferFoodAsset(
            userId, // Quien firma la transferencia
            normalizedRole,
            {
                assetId: id,
                newOwner,
                transferType,
                locationData: defaultLocationData,
                quantity: quantity ? parseInt(quantity) : undefined,
                price: price ? parseFloat(price) : undefined,
                conditions: conditions || 'Buenas condiciones',
                notes: notes || `Transferencia firmada por ${user.name}`
            },
            user.address // Pasar la dirección real del usuario autenticado
        );

        res.json({
            success: true,
            message: 'Producto transferido exitosamente',
            data: {
                result,
                signedBy: `${user.name || 'Usuario'} (${user.role})`
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
router.get('/expiring', async (req: Request, res: Response) => {
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
router.get('/products', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Mapear el rol del authMiddleware al formato interno
        const normalizedRole = user.role.toLowerCase();
        
        // Generar userId basado en el rol para Fabric
        const userId = normalizedRole === 'producer' || normalizedRole === 'admin' 
            ? 'User1@org1.example.com' 
            : 'User1@org2.example.com';

        console.log(`🔧 Obteniendo productos para usuario: ${user.address} (${normalizedRole})`);

        try {
            let products: any[] = [];
            
            // Admin puede ver TODOS los productos, otros roles solo SUS productos
            if (normalizedRole === 'admin') {
                console.log('🔧 Admin - Obteniendo TODOS los productos del sistema');
                products = await fabricGatewayService.getAllProducts();
                
                res.json({
                    success: true,
                    message: 'Todos los productos del sistema obtenidos exitosamente',
                    data: products,
                    owner: {
                        userId: userId,
                        name: user.name || 'Administrador',
                        role: normalizedRole,
                        address: 'admin-global-view'
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log('🔧 Usuario normal - Obteniendo productos propios');
                console.log(`🔧 DEBUG: Rol del usuario: "${normalizedRole}"`);
                
                // Usar la dirección del usuario autenticado como filtro
                const userWalletAddress = user.address;
                console.log(`🔧 DEBUG: Dirección del wallet: ${userWalletAddress}`);
                
                // Obtener solo los productos del usuario actual
                products = await fabricGatewayService.getProductsByOwner(userWalletAddress);
                console.log(`🔧 DEBUG: Productos obtenidos por propietario: ${products.length}`);

                res.json({
                    success: true,
                    message: 'Productos del usuario obtenidos exitosamente',
                    data: products,
                    owner: {
                        userId: userId,
                        name: user.name || `Usuario ${normalizedRole}`,
                        role: normalizedRole,
                        address: userWalletAddress
                    },
                    timestamp: new Date().toISOString()
                });
            }

        } catch (chainError: any) {
            console.log('⚠️ Error obteniendo productos:', chainError.message);
            
            // Si hay error, devolver array vacío
            res.json({
                success: true,
                message: 'No hay productos aún o error al obtenerlos.',
                data: [],
                owner: {
                    userId: userId,
                    name: user.name || `Usuario ${normalizedRole}`,
                    role: normalizedRole,
                    address: user.address
                },
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
 * Migrar productos antiguos a direcciones reales (solo admin)
 */
router.post('/migrate-products', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role.toLowerCase() !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden migrar productos',
                userRole: user?.role || 'no-auth'
            });
            return;
        }

        const { migrations } = req.body;
        if (!migrations || !Array.isArray(migrations)) {
            res.status(400).json({
                success: false,
                message: 'Formato inválido. Se requiere array de migraciones: [{ tokenId, oldOwner, newOwner }]'
            });
            return;
        }

        console.log(`🔄 Iniciando migración de ${migrations.length} productos...`);
        
        const results = [];
        const normalizedRole = user.role.toLowerCase();
        const userId = normalizedRole === 'admin' ? 'User1@org1.example.com' : 'User1@org2.example.com';

        for (const migration of migrations) {
            const { tokenId, oldOwner, newOwner } = migration;
            
            if (!tokenId || !oldOwner || !newOwner) {
                results.push({
                    tokenId: tokenId || 'unknown',
                    status: 'error',
                    message: 'Parámetros incompletos: tokenId, oldOwner, newOwner requeridos'
                });
                continue;
            }

            try {
                const result = await fabricGatewayService.migrateProductOwner(
                    userId,
                    tokenId,
                    oldOwner,
                    newOwner
                );
                
                results.push({
                    tokenId,
                    status: 'success',
                    message: result,
                    migration: { oldOwner, newOwner }
                });
                
                console.log(`✅ Migrado: ${tokenId} de ${oldOwner} a ${newOwner}`);
                
            } catch (error: any) {
                results.push({
                    tokenId,
                    status: 'error',
                    message: error.message,
                    migration: { oldOwner, newOwner }
                });
                
                console.error(`❌ Error migrando ${tokenId}:`, error.message);
            }
        }

        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;

        res.json({
            success: true,
            message: `Migración completada: ${successful} exitosos, ${failed} fallidos`,
            data: {
                totalProcessed: migrations.length,
                successful,
                failed,
                results
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error en migración masiva:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en migración masiva',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Consumir un producto (marcar como consumido)
 */
router.post('/products/:id/consume', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const { id } = req.params;
        const { consumedDate, rating, notes } = req.body;

        // Solo consumidores pueden marcar productos como consumidos
        if (user.role.toLowerCase() !== 'consumer' && user.role.toLowerCase() !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Solo los consumidores pueden marcar productos como consumidos',
                userRole: user.role
            });
            return;
        }

        // Mapear el rol del authMiddleware al formato interno para Fabric
        const normalizedRole = user.role.toLowerCase();
        const userId = normalizedRole === 'producer' || normalizedRole === 'admin' 
            ? 'User1@org1.example.com' 
            : 'User1@org2.example.com';

        console.log(`🔧 Marcando producto ${id} como consumido por ${userId} (${user.role})`);

        const result = await fabricGatewayService.submitTransactionAsUser(
            userId,
            normalizedRole,
            'food',
            'markAsConsumed',
            id,
            consumedDate || new Date().toISOString(),
            rating ? rating.toString() : '',
            notes || `Consumido por ${user.name || 'Usuario'}`
        );

        res.json({
            success: true,
            message: 'Producto marcado como consumido exitosamente',
            data: {
                result,
                consumedBy: `${user.name || 'Usuario'} (${user.role})`
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

/**
 * Obtener transferencias realizadas por el usuario actual
 */
router.get('/transfers', async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const transfers = await fabricGatewayService.getTransfersByOwner(user.address);
        
        res.json({
            success: true,
            data: transfers,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo transferencias:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo transferencias',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
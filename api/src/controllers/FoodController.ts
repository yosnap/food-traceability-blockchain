/**
 * Controlador para operaciones de productos alimentarios
 */

import { Request, Response, NextFunction } from 'express';
import { fabricGatewayService } from '../services/FabricGatewayService.js';
import { body, param, query, validationResult } from 'express-validator';

export class FoodController {

    /**
     * Ping al chaincode para verificar conectividad
     */
    static async ping(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await fabricGatewayService.ping();
            
            res.json({
                success: true,
                message: 'Conexión con chaincode exitosa',
                data: {
                    response: result,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Crea un nuevo producto alimentario
     */
    static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Verificar errores de validación
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Datos de entrada inválidos',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
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
                origin,
                storageConditions,
                allergens,
                weight,
                volume,
                brand,
                signature,
                walletAddress,
                certifications,
                variety
            } = req.body;

            // Log de firma si está presente
            if (signature && walletAddress) {
                console.log('🔏 Producto firmado digitalmente:');
                console.log('  📍 Wallet:', walletAddress);
                console.log('  ✍️ Firma:', signature.substring(0, 20) + '...');
            }

            // Generar ID único para el producto si no se proporciona
            const productId = id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Preparar datos para el chaincode (solo parámetros que acepta)
            const productData = {
                id: productId,
                batchNumber,
                name,
                category,
                description,
                quantity: parseInt(quantity),
                productionDate,
                expirationDate,
                originData: typeof origin === 'object' ? JSON.stringify(origin) : (origin || '{}'),
                storageConditionsData: typeof storageConditions === 'object' ? JSON.stringify(storageConditions) : (storageConditions || '{}'),
                allergens: JSON.stringify(allergens || []),
                weight: weight ? parseFloat(weight) : undefined,
                volume: volume ? parseFloat(volume) : undefined,
                brand
            };

            // Log adicional de datos firmados (no se envían al chaincode pero quedan en logs)
            if (signature && walletAddress) {
                console.log('📄 Datos adicionales del producto firmado:');
                console.log('  🏷️ Certificaciones:', Array.isArray(certifications) ? certifications.join(', ') : (certifications || 'Ninguna'));
                console.log('  🌱 Variedad:', variety || 'No especificada');
            }

            // Obtener el userId del usuario autenticado
            const authenticatedUser = (req as any).user;
            const producerUserId = authenticatedUser?.userId || 'User1@org1.example.com';
            
            console.log('👤 Creando producto como usuario:', producerUserId);

            // Ejecutar transacción en el chaincode
            const result = await fabricGatewayService.createFoodAsset(producerUserId, productData);

            res.status(201).json({
                success: true,
                message: 'Producto creado exitosamente',
                data: {
                    productId,
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene información de un producto
     */
    static async getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            const product = await fabricGatewayService.getFoodAsset(id);

            res.json({
                success: true,
                data: product,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene productos próximos a caducar
     */
    static async getExpiringProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const daysAhead = parseInt(req.query.daysAhead as string) || 2;
            const ownerAddress = req.query.ownerAddress as string;
            const category = req.query.category as string;

            // Si no se especifica owner, usar el usuario actual
            const targetOwner = ownerAddress || req.user?.address;

            const expiringProducts = await fabricGatewayService.getExpiringProducts(
                daysAhead,
                targetOwner,
                category
            );

            res.json({
                success: true,
                data: {
                    products: expiringProducts,
                    count: expiringProducts.length,
                    daysAhead,
                    filters: {
                        owner: targetOwner,
                        category: category || 'all'
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Transfiere un producto entre actores
     */
    static async transferProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Datos de transferencia inválidos',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            const { productId } = req.params;
            const {
                newOwner,
                transferType,
                location,
                quantity,
                price,
                conditions,
                notes
            } = req.body;

            // Obtener el usuario autenticado
            const authenticatedUser = (req as any).user;
            const currentOwnerUserId = authenticatedUser?.userId || authenticatedUser?.fabricUserId || 'User1@org1.example.com';
            const currentOwnerRole = authenticatedUser?.role || 'producer';

            const transferData = {
                assetId: productId,
                newOwner,
                transferType,
                locationData: JSON.stringify(location),
                quantity: quantity ? parseInt(quantity) : undefined,
                price: price ? parseFloat(price) : undefined,
                conditions,
                notes
            };

            console.log(`🔄 Transfiriendo producto ${productId} como ${currentOwnerUserId} (${currentOwnerRole})`);

            const result = await fabricGatewayService.transferFoodAsset(
                currentOwnerUserId,
                currentOwnerRole,
                transferData
            );

            res.json({
                success: true,
                message: 'Producto transferido exitosamente',
                data: {
                    productId,
                    newOwner,
                    transferType,
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Marca un producto como consumido
     */
    static async markAsConsumed(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { productId } = req.params;
            const { consumedDate, rating, notes } = req.body;

            const result = await fabricGatewayService.markAsConsumed(
                productId,
                consumedDate,
                rating ? parseInt(rating) : undefined,
                notes
            );

            res.json({
                success: true,
                message: 'Producto marcado como consumido',
                data: {
                    productId,
                    consumedDate: consumedDate || new Date().toISOString(),
                    rating,
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene productos del usuario actual
     */
    static async getMyProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Solo verificar que el usuario esté autenticado (wallet conectada)
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({
                    success: false,
                    error: {
                        message: 'Usuario no autenticado',
                        code: 'USER_NOT_AUTHENTICATED',
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            console.log('🔧 Autenticado como:', authenticatedUser.name || 'Usuario', `(${authenticatedUser.role || 'sin rol'})`);
            
            // Obtener TODOS los productos del sistema (sin filtrar por usuario)
            console.log('🔍 Obteniendo todos los productos del sistema...');
            const allProducts = await fabricGatewayService.getAllProducts();

            res.json({
                success: true,
                message: 'Productos obtenidos exitosamente',
                data: allProducts,
                owner: {
                    userId: authenticatedUser.fabricUserId || authenticatedUser.userId,
                    name: authenticatedUser.name,
                    role: authenticatedUser.role,
                    address: authenticatedUser.address
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca productos por categoría
     */
    static async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category } = req.params;
            
            // Usar getExpiringProducts con filtro de categoría y rango amplio
            const products = await fabricGatewayService.getExpiringProducts(365, undefined, category);

            res.json({
                success: true,
                data: {
                    products,
                    count: products.length,
                    category
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene estadísticas del usuario
     */
    static async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userAddress = req.user?.address;
            if (!userAddress) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Usuario no identificado',
                        code: 'USER_NOT_IDENTIFIED',
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            // Obtener productos del usuario
            const allProducts = await fabricGatewayService.getExpiringProducts(365, userAddress);
            const expiringProducts = await fabricGatewayService.getExpiringProducts(7, userAddress);
            const criticalProducts = await fabricGatewayService.getExpiringProducts(1, userAddress);

            // Calcular estadísticas
            const stats = {
                totalProducts: allProducts.length,
                expiringThisWeek: expiringProducts.length,
                expiringToday: criticalProducts.length,
                categoriesCount: {} as { [key: string]: number },
                averageDaysToExpiry: 0
            };

            // Agrupar por categorías
            allProducts.forEach(product => {
                stats.categoriesCount[product.category] = (stats.categoriesCount[product.category] || 0) + 1;
            });

            // Calcular promedio de días hasta caducidad
            if (allProducts.length > 0) {
                const totalDays = allProducts.reduce((sum, product) => sum + product.daysRemaining, 0);
                stats.averageDaysToExpiry = Math.round(totalDays / allProducts.length);
            }

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene las transferencias realizadas por un propietario
     */
    static async getTransfersByOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    success: false,
                    error: {
                        message: 'Usuario no autenticado',
                        code: 'UNAUTHORIZED',
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            const transfers = await fabricGatewayService.getTransfersByOwner(user.address);
            
            res.json({
                success: true,
                data: transfers,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
}

// Validaciones para crear producto
export const createProductValidation = [
    body('id').notEmpty().withMessage('ID es requerido'),
    body('batchNumber').notEmpty().withMessage('Número de lote es requerido'),
    body('name').notEmpty().withMessage('Nombre es requerido'),
    body('category').notEmpty().withMessage('Categoría es requerida'),
    body('description').notEmpty().withMessage('Descripción es requerida'),
    body('quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser un número positivo'),
    body('productionDate').isISO8601().withMessage('Fecha de producción inválida'),
    body('expirationDate').isISO8601().withMessage('Fecha de caducidad inválida'),
    body('origin').isObject().withMessage('Información de origen requerida'),
    body('storageConditions').isObject().withMessage('Condiciones de almacenamiento requeridas')
];

// Validaciones para transferir producto
export const transferProductValidation = [
    param('productId').notEmpty().withMessage('ID de producto requerido'),
    body('newOwner').notEmpty().withMessage('Nuevo propietario requerido'),
    body('transferType').notEmpty().withMessage('Tipo de transferencia requerido'),
    body('location').isObject().withMessage('Ubicación requerida')
];
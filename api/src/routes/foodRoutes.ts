/**
 * Rutas para operaciones de productos alimentarios
 */

import { Router } from 'express';
import { FoodController, createProductValidation, transferProductValidation } from '../controllers/FoodController.js';
import { requireRole, requireVerified } from '../middleware/authMiddleware.js';

const router = Router();

// Aplicar middleware de verificación a todas las rutas
router.use(requireVerified);

/**
 * GET /api/food/ping
 * Verifica conectividad con el chaincode
 */
router.get('/ping', FoodController.ping);

/**
 * POST /api/food/products
 * Crear un nuevo producto (solo PRODUCER y PROCESSOR)
 */
router.post('/products', 
    requireRole(['PRODUCER', 'PROCESSOR']),
    createProductValidation,
    FoodController.createProduct
);

/**
 * GET /api/food/products/:id
 * Obtener información de un producto específico
 */
router.get('/products/:id', FoodController.getProduct);

/**
 * GET /api/food/products
 * Obtener productos del usuario actual
 */
router.get('/products', FoodController.getMyProducts);

/**
 * GET /api/food/products/category/:category
 * Obtener productos por categoría
 */
router.get('/products/category/:category', FoodController.getProductsByCategory);

/**
 * GET /api/food/expiring
 * Obtener productos próximos a caducar
 * Query params: daysAhead (default: 2), ownerAddress, category
 */
router.get('/expiring', FoodController.getExpiringProducts);

/**
 * POST /api/food/products/:productId/transfer
 * Transferir un producto (todos los roles excepto CONSUMER para compras)
 */
router.post('/products/:productId/transfer',
    requireRole(['PRODUCER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER']),
    transferProductValidation,
    FoodController.transferProduct
);

/**
 * POST /api/food/products/:productId/consume
 * Marcar producto como consumido (solo CONSUMER)
 */
router.post('/products/:productId/consume',
    requireRole(['CONSUMER']),
    FoodController.markAsConsumed
);

/**
 * GET /api/food/stats
 * Obtener estadísticas del usuario actual
 */
router.get('/stats', FoodController.getUserStats);

export default router;
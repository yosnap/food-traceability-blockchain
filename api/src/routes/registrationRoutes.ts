/**
 * Rutas para gestión de solicitudes de registro
 * Permite a usuarios solicitar registro y a admins gestionar las solicitudes
 */

import { Router } from 'express';
import { 
    submitRegistrationRequest,
    getPendingRequests,
    getRequestDetails,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    getUserProfile,
    updateUserProfile,
    checkRequestStatus
} from '../controllers/RegistrationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

/**
 * POST /api/registration/request
 * Enviar solicitud de registro (público, no requiere autenticación)
 */
router.post('/request', submitRegistrationRequest);

/**
 * GET /api/registration/status/:walletAddress
 * Verificar estado de solicitud por wallet (público)
 */
router.get('/status/:walletAddress', checkRequestStatus);

// ==========================================
// RUTAS PROTEGIDAS PARA USUARIOS
// ==========================================

/**
 * GET /api/registration/profile
 * Obtener perfil del usuario actual (requiere autenticación)
 */
router.get('/profile', authMiddleware, getUserProfile);

/**
 * PUT /api/registration/profile
 * Actualizar perfil del usuario actual (requiere autenticación)
 */
router.put('/profile', authMiddleware, updateUserProfile);

// ==========================================
// RUTAS PROTEGIDAS PARA ADMINISTRADORES
// ==========================================

/**
 * GET /api/registration/admin/requests
 * Obtener solicitudes pendientes (solo admin)
 */
router.get('/admin/requests', authMiddleware, adminMiddleware, getPendingRequests);

/**
 * GET /api/registration/admin/requests/:requestId
 * Obtener detalles de una solicitud específica (solo admin)
 */
router.get('/admin/requests/:requestId', authMiddleware, adminMiddleware, getRequestDetails);

/**
 * POST /api/registration/admin/approve/:requestId
 * Aprobar solicitud de registro (solo admin)
 */
router.post('/admin/approve/:requestId', authMiddleware, adminMiddleware, approveRegistrationRequest);

/**
 * POST /api/registration/admin/reject/:requestId
 * Rechazar solicitud de registro (solo admin)
 */
router.post('/admin/reject/:requestId', authMiddleware, adminMiddleware, rejectRegistrationRequest);

export default router;
/**
 * Rutas para operaciones de usuarios
 */

import { Router } from 'express';
import { 
    UserController, 
    registerUserValidation, 
    notificationSettingsValidation,
    updateProfileValidation 
} from '../controllers/UserController.js';
import { requireRole, requireVerified } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * POST /api/users/register
 * Registrar un nuevo usuario (público, sin autenticación)
 */
router.post('/register', 
    registerUserValidation,
    UserController.registerUser
);

/**
 * GET /api/users/me
 * Obtener información del usuario actual
 */
router.get('/me', 
    requireVerified,
    UserController.getCurrentUser
);

/**
 * GET /api/users/:address
 * Obtener información de un usuario específico
 */
router.get('/:address', 
    requireVerified,
    UserController.getUser
);

/**
 * PUT /api/users/me
 * Actualizar perfil del usuario actual
 */
router.put('/me',
    requireVerified,
    updateProfileValidation,
    UserController.updateProfile
);

/**
 * GET /api/users/me/notifications
 * Obtener configuración de notificaciones del usuario
 */
router.get('/me/notifications',
    requireVerified,
    UserController.getNotificationSettings
);

/**
 * PUT /api/users/me/notifications
 * Configurar notificaciones del usuario
 */
router.put('/me/notifications',
    requireVerified,
    notificationSettingsValidation,
    UserController.setNotificationSettings
);

export default router;
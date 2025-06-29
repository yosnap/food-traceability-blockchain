/**
 * Controlador para operaciones de usuarios
 */

import { Request, Response, NextFunction } from 'express';
import { fabricService } from '../services/FabricService.js';
import { body, validationResult } from 'express-validator';

export class UserController {

    /**
     * Registra un nuevo usuario
     */
    static async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Datos de usuario inválidos',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            const {
                address,
                name,
                role,
                email,
                phone,
                location,
                licenseNumber
            } = req.body;

            const userData = {
                address,
                name,
                role,
                email,
                phone,
                locationData: JSON.stringify(location),
                licenseNumber
            };

            const result = await fabricService.registerUser(userData);

            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                data: {
                    userAddress: address,
                    name,
                    role,
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene información del usuario actual
     */
    static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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

            const user = await fabricService.getUser(userAddress);

            res.json({
                success: true,
                data: user,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene información de un usuario específico
     */
    static async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { address } = req.params;

            const user = await fabricService.getUser(address);

            res.json({
                success: true,
                data: user,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Configura las notificaciones del usuario
     */
    static async setNotificationSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Configuración de notificaciones inválida',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

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

            const {
                enableNotifications = true,
                notificationDays = 2,
                enableEmailNotifications = true,
                enablePushNotifications = true,
                quietHours,
                categorySettings
            } = req.body;

            const settingsData = {
                userId: userAddress,
                enableNotifications,
                notificationDays,
                enableEmailNotifications,
                enablePushNotifications,
                quietHoursData: quietHours ? JSON.stringify(quietHours) : undefined,
                categorySettingsData: categorySettings ? JSON.stringify(categorySettings) : undefined
            };

            const result = await fabricService.setNotificationSettings(settingsData);

            res.json({
                success: true,
                message: 'Configuración de notificaciones actualizada',
                data: {
                    userId: userAddress,
                    settings: {
                        enableNotifications,
                        notificationDays,
                        enableEmailNotifications,
                        enablePushNotifications
                    },
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene la configuración de notificaciones del usuario
     */
    static async getNotificationSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
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

            // Obtener usuario completo que incluye configuración de notificaciones
            const user = await fabricService.getUser(userAddress);

            res.json({
                success: true,
                data: {
                    notificationSettings: user.notificationSettings || {
                        enableNotifications: true,
                        notificationDays: 2,
                        enableEmailNotifications: true,
                        enablePushNotifications: true,
                        quietHours: null,
                        categorySettings: null
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Actualiza el perfil del usuario
     */
    static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    error: {
                        message: 'Datos de perfil inválidos',
                        code: 'VALIDATION_ERROR',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

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

            const {
                name,
                email,
                phone,
                location
            } = req.body;

            // Obtener datos actuales del usuario
            const currentUser = await fabricService.getUser(userAddress);

            // Preparar datos actualizados
            const updatedUserData = {
                address: userAddress,
                name: name || currentUser.name,
                role: currentUser.role, // El rol no se puede cambiar
                email: email || currentUser.email,
                phone: phone || currentUser.phone,
                locationData: location ? JSON.stringify(location) : currentUser.locationData,
                licenseNumber: currentUser.licenseNumber
            };

            // Re-registrar usuario con datos actualizados
            const result = await fabricService.registerUser(updatedUserData);

            res.json({
                success: true,
                message: 'Perfil actualizado exitosamente',
                data: {
                    userAddress,
                    updatedFields: Object.keys(req.body),
                    transactionResult: result
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            next(error);
        }
    }
}

// Validaciones para registro de usuario
export const registerUserValidation = [
    body('address').notEmpty().withMessage('Dirección es requerida'),
    body('name').notEmpty().withMessage('Nombre es requerido'),
    body('role').isIn(['PRODUCER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER', 'ADMIN'])
        .withMessage('Rol inválido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('phone').notEmpty().withMessage('Teléfono es requerido'),
    body('location').isObject().withMessage('Ubicación requerida')
];

// Validaciones para configuración de notificaciones
export const notificationSettingsValidation = [
    body('enableNotifications').optional().isBoolean().withMessage('enableNotifications debe ser booleano'),
    body('notificationDays').optional().isInt({ min: 1, max: 30 })
        .withMessage('notificationDays debe ser entre 1 y 30'),
    body('enableEmailNotifications').optional().isBoolean().withMessage('enableEmailNotifications debe ser booleano'),
    body('enablePushNotifications').optional().isBoolean().withMessage('enablePushNotifications debe ser booleano')
];

// Validaciones para actualización de perfil
export const updateProfileValidation = [
    body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phone').optional().notEmpty().withMessage('Teléfono no puede estar vacío'),
    body('location').optional().isObject().withMessage('Ubicación debe ser un objeto')
];
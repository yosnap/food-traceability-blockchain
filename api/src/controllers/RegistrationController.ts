/**
 * Controlador para solicitudes de registro y gestión de perfiles
 */

import { Request, Response } from 'express';
import { registrationRequestService } from '../services/RegistrationRequestService.js';
import { ethers } from 'ethers';

export interface RegistrationFormRequest extends Request {
    body: {
        walletAddress: string;
        requestedRole: string;
        personalInfo: {
            fullName: string;
            email: string;
            phone?: string;
            organization?: string;
            address?: string;
            country?: string;
        };
        businessInfo?: {
            companyName?: string;
            businessType?: string;
            registrationNumber?: string;
            description?: string;
        };
        signature: string;
        message: string;
    };
}

/**
 * Enviar solicitud de registro (público, no requiere autenticación)
 */
export const submitRegistrationRequest = async (req: RegistrationFormRequest, res: Response): Promise<void> => {
    try {
        console.log('📝 Nueva solicitud de registro recibida');

        const { walletAddress, requestedRole, personalInfo, businessInfo, signature, message } = req.body;

        // Validaciones básicas
        if (!walletAddress || !requestedRole || !personalInfo || !signature || !message) {
            res.status(400).json({
                success: false,
                error: 'Datos incompletos',
                message: 'Todos los campos obligatorios deben estar completos',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar wallet address
        if (!ethers.isAddress(walletAddress)) {
            res.status(400).json({
                success: false,
                error: 'Wallet inválida',
                message: 'La dirección de wallet no es válida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar rol
        const validRoles = ['producer', 'factory', 'retailer', 'consumer'];
        if (!validRoles.includes(requestedRole.toLowerCase())) {
            res.status(400).json({
                success: false,
                error: 'Rol inválido',
                message: `Rol debe ser uno de: ${validRoles.join(', ')}`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar información personal obligatoria
        if (!personalInfo.fullName || !personalInfo.email) {
            res.status(400).json({
                success: false,
                error: 'Información incompleta',
                message: 'Nombre completo y email son obligatorios',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(personalInfo.email)) {
            res.status(400).json({
                success: false,
                error: 'Email inválido',
                message: 'El formato del email no es válido',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Crear solicitud
        const result = await registrationRequestService.createRegistrationRequest({
            walletAddress,
            requestedRole: requestedRole.toLowerCase(),
            personalInfo,
            businessInfo,
            signature,
            message
        });

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Solicitud de registro enviada exitosamente',
                requestId: result.requestId,
                status: 'pending',
                nextSteps: [
                    'Tu solicitud será revisada por un administrador',
                    'Recibirás una notificación por email cuando sea procesada',
                    'Una vez aprobada, podrás iniciar sesión con tu wallet'
                ],
                estimatedProcessingTime: '1-3 días hábiles',
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Solicitud creada: ${result.requestId} para ${personalInfo.fullName}`);
        } else {
            res.status(400).json({
                success: false,
                error: 'Error en solicitud',
                message: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error procesando solicitud:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: 'Error procesando la solicitud de registro',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtener solicitudes pendientes (solo admin)
 */
export const getPendingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('📋 Obteniendo solicitudes pendientes');

        const pendingRequests = await registrationRequestService.getPendingRequests();

        // Ordenar por fecha de solicitud (más recientes primero)
        const sortedRequests = pendingRequests.sort((a, b) => 
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );

        res.json({
            success: true,
            message: 'Solicitudes pendientes obtenidas',
            requests: sortedRequests,
            count: sortedRequests.length,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo solicitudes:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtener detalles de una solicitud específica (solo admin)
 */
export const getRequestDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { requestId } = req.params;

        console.log(`🔍 Obteniendo detalles de solicitud: ${requestId}`);

        // Buscar la solicitud (esto requeriría expandir el servicio)
        const allRequests = await registrationRequestService.getPendingRequests();
        const request = allRequests.find(r => r.id === requestId);

        if (!request) {
            res.status(404).json({
                success: false,
                error: 'Solicitud no encontrada',
                message: `No se encontró la solicitud con ID: ${requestId}`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        res.json({
            success: true,
            message: 'Detalles de solicitud obtenidos',
            request,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo solicitud:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Aprobar solicitud de registro (solo admin)
 */
export const approveRegistrationRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { requestId } = req.params;
        const { adminNotes, createUserImmediately = false } = req.body;

        console.log(`✅ Aprobando solicitud: ${requestId}`);

        // Obtener información del admin desde el middleware
        const adminWallet = (req as any).user?.walletAddress || (req as any).admin?.walletAddress;

        if (!adminWallet) {
            res.status(401).json({
                success: false,
                error: 'Admin no identificado',
                message: 'No se pudo identificar al administrador',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Aprobar solicitud
        const approvalResult = await registrationRequestService.approveRequest(
            requestId,
            adminWallet,
            adminNotes
        );

        if (!approvalResult.success) {
            res.status(400).json({
                success: false,
                error: 'Error aprobando solicitud',
                message: approvalResult.error,
                timestamp: new Date().toISOString()
            });
            return;
        }

        res.json({
            success: true,
            message: 'Solicitud aprobada exitosamente',
            request: {
                id: requestId,
                approvedBy: adminWallet,
                approvedAt: new Date().toISOString(),
                adminNotes
            },
            actions: {
                emailSent: true,
                userNotified: true,
                profileCreated: true
            },
            nextSteps: createUserImmediately ? [
                'Usuario notificado por email',
                'Perfil creado en el sistema',
                'Usuario puede iniciar sesión',
                'Crear certificado y usuario en blockchain manualmente'
            ] : [
                'Usuario notificado por email',
                'Perfil creado en el sistema',
                'Crear usuario y certificado en blockchain cuando sea necesario'
            ],
            adminActions: [
                'El usuario ya puede usar el sistema para consultas',
                'Para operaciones que requieren certificado, debe crear el usuario en blockchain',
                'Use el panel de administración para crear el certificado .pem'
            ],
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Solicitud ${requestId} aprobada por ${adminWallet}`);

    } catch (error: any) {
        console.error('❌ Error aprobando solicitud:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Rechazar solicitud de registro (solo admin)
 */
export const rejectRegistrationRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body;

        console.log(`❌ Rechazando solicitud: ${requestId}`);

        if (!reason || reason.trim() === '') {
            res.status(400).json({
                success: false,
                error: 'Motivo requerido',
                message: 'Debe proporcionar un motivo para el rechazo',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const adminWallet = (req as any).user?.walletAddress || (req as any).admin?.walletAddress;

        if (!adminWallet) {
            res.status(401).json({
                success: false,
                error: 'Admin no identificado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await registrationRequestService.rejectRequest(
            requestId,
            adminWallet,
            reason
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Solicitud rechazada',
                request: {
                    id: requestId,
                    rejectedBy: adminWallet,
                    rejectedAt: new Date().toISOString(),
                    reason
                },
                actions: {
                    emailSent: true,
                    userNotified: true
                },
                timestamp: new Date().toISOString()
            });

            console.log(`❌ Solicitud ${requestId} rechazada por ${adminWallet}: ${reason}`);
        } else {
            res.status(400).json({
                success: false,
                error: 'Error rechazando solicitud',
                message: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error rechazando solicitud:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtener perfil del usuario actual
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const walletAddress = (req as any).user?.walletAddress;

        if (!walletAddress) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        const profile = await registrationRequestService.getUserProfile(walletAddress);

        if (!profile) {
            res.status(404).json({
                success: false,
                error: 'Perfil no encontrado',
                message: 'No se encontró perfil para este usuario. Es posible que su solicitud aún esté pendiente.',
                timestamp: new Date().toISOString()
            });
            return;
        }

        res.json({
            success: true,
            message: 'Perfil obtenido exitosamente',
            profile: {
                ...profile,
                // No exponer información sensible si es necesario
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Actualizar perfil del usuario
 */
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const walletAddress = (req as any).user?.walletAddress;
        const updates = req.body;

        if (!walletAddress) {
            res.status(401).json({
                success: false,
                error: 'Usuario no autenticado',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar email si se está actualizando
        if (updates.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.email)) {
                res.status(400).json({
                    success: false,
                    error: 'Email inválido',
                    message: 'El formato del email no es válido',
                    timestamp: new Date().toISOString()
                });
                return;
            }
        }

        const result = await registrationRequestService.updateUserProfile(
            walletAddress,
            updates
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Perfil actualizado exitosamente',
                updatedFields: Object.keys(updates),
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Perfil actualizado para ${walletAddress}`);
        } else {
            res.status(400).json({
                success: false,
                error: 'Error actualizando perfil',
                message: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error: any) {
        console.error('❌ Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Verificar estado de solicitud por wallet (público)
 */
export const checkRequestStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { walletAddress } = req.params;

        // Validación básica de formato de dirección Ethereum
        if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
            res.status(400).json({
                success: false,
                error: 'Wallet inválida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar si existe perfil
        const profile = await registrationRequestService.getUserProfile(walletAddress);
        
        if (profile) {
            res.json({
                success: true,
                status: 'approved',
                message: 'Usuario registrado y activo',
                canLogin: true,
                profile: {
                    role: profile.role,
                    fullName: profile.personalInfo.fullName,
                    organization: profile.personalInfo.organization,
                    registeredAt: profile.createdAt,
                    isActive: profile.isActive
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Si no hay perfil, la solicitud puede estar pendiente o no existir
        res.json({
            success: true,
            status: 'not_found',
            message: 'No se encontró registro para esta wallet',
            canLogin: false,
            suggestedAction: 'Enviar solicitud de registro',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error verificando estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
/**
 * Contrato para gestión de usuarios y roles
 * Food Traceability Blockchain Platform
 */

import { Contract, Context, Info, Returns, Transaction } from 'fabric-contract-api';
import { User, UserRole, NotificationSettings } from '../models';
import { ValidationUtils, ChainUtils, DateUtils } from '../utils';

@Info({
    title: 'UserContract',
    description: 'Smart contract para gestión de usuarios y configuraciones'
})
export class UserContract extends Contract {

    constructor() {
        super('UserContract');
    }

    // ==========================================
    // GESTIÓN DE CONFIGURACIONES DE USUARIO
    // ==========================================

    /**
     * Configura las preferencias de notificaciones de un usuario
     */
    @Transaction()
    public async setNotificationSettings(
        ctx: Context,
        userId: string,
        enableNotifications: boolean,
        notificationDays: number,
        enableEmailNotifications: boolean,
        enablePushNotifications: boolean,
        quietHoursData?: string, // JSON string con start y end
        categorySettingsData?: string // JSON string con configuraciones por categoría
    ): Promise<string> {

        if (!ValidationUtils.isValidBlockchainAddress(userId)) {
            throw new Error('ID de usuario inválido');
        }

        if (!ValidationUtils.isValidNotificationDays(notificationDays)) {
            throw new Error('Días de notificación inválidos (1-30)');
        }

        // Verificar que el usuario existe
        const userExists = await ChainUtils.assetExists(ctx, `USER_${userId}`);
        if (!userExists) {
            throw new Error(`Usuario ${userId} no existe`);
        }

        // Verificar permisos (solo el propio usuario puede configurar sus notificaciones)
        const currentUserId = ChainUtils.getClientId(ctx);
        if (userId !== currentUserId) {
            throw new Error('Solo puedes configurar tus propias notificaciones');
        }

        // Parsear datos opcionales
        let quietHours;
        let categorySettings;

        if (quietHoursData) {
            try {
                quietHours = JSON.parse(quietHoursData);
                // Validar formato de horas (HH:mm)
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(quietHours.start) || !timeRegex.test(quietHours.end)) {
                    throw new Error('Formato de horas silenciosas inválido (usar HH:mm)');
                }
            } catch (error) {
                throw new Error('Datos de horas silenciosas inválidos');
            }
        }

        if (categorySettingsData) {
            try {
                categorySettings = JSON.parse(categorySettingsData);
            } catch (error) {
                throw new Error('Configuraciones de categoría inválidas');
            }
        }

        // Crear configuración de notificaciones
        const notificationSettings: NotificationSettings = {
            userId,
            enableNotifications,
            notificationDays,
            enableEmailNotifications,
            enablePushNotifications,
            quietHours,
            categorySettings
        };

        // Guardar configuración
        await ChainUtils.putAssetToLedger(ctx, `NOTIFICATION_SETTINGS_${userId}`, notificationSettings);

        ChainUtils.emitEvent(ctx, 'NotificationSettingsUpdated', {
            userId,
            notificationDays,
            enableNotifications,
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Configuración de notificaciones actualizada para usuario ${userId}`;
    }

    /**
     * Obtiene las configuraciones de notificaciones de un usuario
     */
    @Transaction(false)
    @Returns('string')
    public async getNotificationSettings(ctx: Context, userId: string): Promise<string> {
        if (!ValidationUtils.isValidBlockchainAddress(userId)) {
            throw new Error('ID de usuario inválido');
        }

        try {
            const settings = await ChainUtils.getAssetFromLedger<NotificationSettings>(
                ctx, 
                `NOTIFICATION_SETTINGS_${userId}`
            );
            return JSON.stringify(settings);
        } catch (error) {
            // Si no hay configuraciones, retornar configuración por defecto
            const defaultSettings: NotificationSettings = {
                userId,
                enableNotifications: true,
                notificationDays: 2,
                enableEmailNotifications: false,
                enablePushNotifications: true
            };
            return JSON.stringify(defaultSettings);
        }
    }

    /**
     * Obtiene todos los usuarios con notificaciones habilitadas
     */
    @Transaction(false)
    @Returns('string')
    public async getUsersWithNotificationsEnabled(ctx: Context): Promise<string> {
        // Solo administradores pueden ver esta información
        ChainUtils.validateClientPermissions(ctx, 'admin');

        const queryString = ChainUtils.buildQuerySelector({
            enableNotifications: true
        });

        try {
            const settings = await ChainUtils.executeRichQuery<NotificationSettings>(ctx, queryString);
            return JSON.stringify(settings);
        } catch (error) {
            return JSON.stringify([]);
        }
    }

    // ==========================================
    // GESTIÓN AVANZADA DE USUARIOS
    // ==========================================

    /**
     * Obtiene todos los usuarios por rol
     */
    @Transaction(false)
    @Returns('string')
    public async getUsersByRole(ctx: Context, role: string): Promise<string> {
        if (!Object.values(UserRole).includes(role as UserRole)) {
            throw new Error(`Rol inválido: ${role}`);
        }

        const queryString = ChainUtils.buildQuerySelector({
            role
        });

        const users = await ChainUtils.executeRichQuery<User>(ctx, queryString);
        return JSON.stringify(users);
    }

    /**
     * Obtiene usuarios activos
     */
    @Transaction(false)
    @Returns('string')
    public async getActiveUsers(ctx: Context): Promise<string> {
        const queryString = ChainUtils.buildQuerySelector({
            isActive: true
        });

        const users = await ChainUtils.executeRichQuery<User>(ctx, queryString);
        return JSON.stringify(users);
    }

    /**
     * Obtiene usuarios verificados
     */
    @Transaction(false)
    @Returns('string')
    public async getVerifiedUsers(ctx: Context): Promise<string> {
        const queryString = ChainUtils.buildQuerySelector({
            isVerified: true
        });

        const users = await ChainUtils.executeRichQuery<User>(ctx, queryString);
        return JSON.stringify(users);
    }

    /**
     * Desactiva un usuario (solo administradores)
     */
    @Transaction()
    public async deactivateUser(ctx: Context, userId: string, reason?: string): Promise<string> {
        // Solo administradores pueden desactivar usuarios
        ChainUtils.validateClientPermissions(ctx, 'admin');

        if (!ValidationUtils.isValidBlockchainAddress(userId)) {
            throw new Error('ID de usuario inválido');
        }

        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${userId}`);
        
        user.isActive = false;
        
        await ChainUtils.putAssetToLedger(ctx, `USER_${userId}`, user);

        ChainUtils.emitEvent(ctx, 'UserDeactivated', {
            userId,
            deactivatedBy: ChainUtils.getClientId(ctx),
            reason: reason || 'No especificada',
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Usuario ${userId} desactivado`;
    }

    /**
     * Reactiva un usuario (solo administradores)
     */
    @Transaction()
    public async reactivateUser(ctx: Context, userId: string): Promise<string> {
        // Solo administradores pueden reactivar usuarios
        ChainUtils.validateClientPermissions(ctx, 'admin');

        if (!ValidationUtils.isValidBlockchainAddress(userId)) {
            throw new Error('ID de usuario inválido');
        }

        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${userId}`);
        
        user.isActive = true;
        
        await ChainUtils.putAssetToLedger(ctx, `USER_${userId}`, user);

        ChainUtils.emitEvent(ctx, 'UserReactivated', {
            userId,
            reactivatedBy: ChainUtils.getClientId(ctx),
            timestamp: DateUtils.getCurrentISOString()
        });

        return `Usuario ${userId} reactivado`;
    }

    /**
     * Obtiene estadísticas de usuarios
     */
    @Transaction(false)
    @Returns('string')
    public async getUserStats(ctx: Context): Promise<string> {
        // Solo administradores pueden ver estadísticas
        ChainUtils.validateClientPermissions(ctx, 'admin');

        try {
            // Consulta todos los usuarios
            const allUsersQuery = ChainUtils.buildQuerySelector({});
            const allUsers = await ChainUtils.executeRichQuery<User>(ctx, allUsersQuery);

            // Calcular estadísticas
            const stats = {
                totalUsers: allUsers.length,
                activeUsers: allUsers.filter(u => u.isActive).length,
                verifiedUsers: allUsers.filter(u => u.isVerified).length,
                usersByRole: {} as { [key in UserRole]: number },
                recentRegistrations: allUsers.filter(u => {
                    const registrationDate = new Date(u.registrationDate);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return registrationDate >= thirtyDaysAgo;
                }).length
            };

            // Contar usuarios por rol
            Object.values(UserRole).forEach(role => {
                stats.usersByRole[role] = allUsers.filter(u => u.role === role).length;
            });

            return JSON.stringify(stats);

        } catch (error: any) {
            throw new Error(`Error al obtener estadísticas de usuarios: ${error.message}`);
        }
    }

    // ==========================================
    // FUNCIONES DE UTILIDAD
    // ==========================================

    /**
     * Verifica si un usuario es administrador
     */
    @Transaction(false)
    @Returns('boolean')
    public async isAdmin(ctx: Context, userId: string): Promise<boolean> {
        try {
            const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${userId}`);
            return user.role === UserRole.ADMIN;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verifica si un usuario está activo y verificado
     */
    @Transaction(false)
    @Returns('boolean')
    public async isUserActiveAndVerified(ctx: Context, userId: string): Promise<boolean> {
        try {
            const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${userId}`);
            return user.isActive && user.isVerified;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene el rol de un usuario
     */
    @Transaction(false)
    @Returns('string')
    public async getUserRole(ctx: Context, userId: string): Promise<string> {
        const user = await ChainUtils.getAssetFromLedger<User>(ctx, `USER_${userId}`);
        return user.role;
    }

    /**
     * Función ping para verificar conectividad
     */
    @Transaction(false)
    @Returns('string')
    public async ping(ctx: Context): Promise<string> {
        return `Pong! UserContract está funcionando. Timestamp: ${DateUtils.getCurrentISOString()}`;
    }
}
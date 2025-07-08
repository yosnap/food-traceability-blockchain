/**
 * Controlador HLF que implementa autenticación X.509 real
 * Basado en el patrón del repositorio de referencia
 */

import { Request, Response } from 'express';
import { hlfService } from '../services/HLFService.js';

// Interface para usuario autenticado con certificados X.509
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: string;
        mspId: string;
        certificateId: string;
    };
}

/**
 * Controlador para ping con autenticación X.509
 */
export const pingHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // Usar usuario autenticado o Admin por defecto
        const userId = req.user?.userId || 'Admin';
        const role = req.user?.role || 'admin';

        console.log(`📡 Ping HLF solicitado por ${userId} (${role})`);

        const result = await hlfService.ping(userId, role);

        res.json({
            success: true,
            message: 'Ping HLF exitoso',
            result,
            user: {
                userId,
                role,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error en ping HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error de conexión con Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Controlador para ping con nombre personalizado
 */
export const pingHolaHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name } = req.params;
        const userId = req.user?.userId || 'Admin';
        const role = req.user?.role || 'admin';

        console.log(`📡 PingHola HLF solicitado por ${userId} para ${name}`);

        const result = await hlfService.evaluateTransaction(userId, role, 'pingHola', name);

        res.json({
            success: true,
            message: `Ping personalizado HLF exitoso para ${name}`,
            result,
            user: {
                userId,
                role,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error en pingHola HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error de conexión con Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Controlador para crear usuario con autenticación X.509
 */
export const createUserHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { address, role, signature } = req.body;
        const adminUserId = req.user?.userId || 'Admin';
        const adminRole = req.user?.role || 'admin';

        console.log(`👤 Creando usuario ${address} (${role}) por ${adminUserId}`);

        // Validar que solo admins pueden crear usuarios
        if (adminRole !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Solo administradores pueden crear usuarios',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Usar el UserContractReference para crear usuario con firma
        const result = await hlfService.submitTransaction(
            adminUserId,
            adminRole,
            'UserContractReference:createUser',
            address,
            role,
            signature || ''
        );

        res.json({
            success: true,
            message: 'Usuario creado exitosamente',
            result: JSON.parse(result),
            admin: {
                userId: adminUserId,
                role: adminRole,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error creando usuario HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error creando usuario en Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Controlador para obtener usuario por dirección
 */
export const getUserHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { address } = req.params;
        const userId = req.user?.userId || 'Admin';
        const role = req.user?.role || 'admin';

        console.log(`👤 Obteniendo usuario ${address} por ${userId}`);

        const result = await hlfService.evaluateTransaction(
            userId,
            role,
            'UserContractReference:getUser',
            address
        );

        res.json({
            success: true,
            message: 'Usuario obtenido exitosamente',
            result: JSON.parse(result),
            requester: {
                userId,
                role,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo usuario HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuario de Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Controlador para tokenizar activo
 */
export const tokenizeAssetHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { tokenId, name, amount, attributes } = req.body;
        const userId = req.user?.userId || 'Admin';
        const role = req.user?.role || 'admin';

        console.log(`🪙 Tokenizando activo ${tokenId} por ${userId}`);

        const result = await hlfService.submitTransaction(
            userId,
            role,
            'TokenizarContract:createToken',
            tokenId,
            req.user?.userId || userId, // owner
            name,
            amount.toString(),
            JSON.stringify(attributes || {}),
            '' // signature placeholder
        );

        res.json({
            success: true,
            message: 'Activo tokenizado exitosamente',
            result: JSON.parse(result),
            creator: {
                userId,
                role,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error tokenizando activo HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error tokenizando activo en Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Controlador para transferir token
 */
export const transferTokenHLF = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { tokenId, to, amount, signature } = req.body;
        const userId = req.user?.userId || 'Admin';
        const role = req.user?.role || 'admin';

        console.log(`📤 Transfiriendo token ${tokenId} a ${to} por ${userId}`);

        const result = await hlfService.submitTransaction(
            userId,
            role,
            'TokenizarContract:transferToken',
            tokenId,
            to,
            amount.toString(),
            signature || ''
        );

        res.json({
            success: true,
            message: 'Token transferido exitosamente',
            result: JSON.parse(result),
            sender: {
                userId,
                role,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error transfiriendo token HLF:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error transfiriendo token en Fabric',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
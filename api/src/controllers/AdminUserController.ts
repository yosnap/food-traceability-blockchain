/**
 * Controlador para gestión de usuarios por parte del administrador
 * Integra wallets de Metamask con certificados .pem
 */

import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { userCertificateService, CreateUserCertificateRequest } from '../services/UserCertificateService.js';
import { hlfService } from '../services/HLFService.js';

export interface AdminAuthenticatedRequest extends Request {
    user?: {
        address: string;
        role: string;
        name?: string;
        isVerified?: boolean;
        fabricUserId?: string;
        mspId?: string;
        organizationName?: string;
        certificateGenerated?: boolean;
        userId?: string;
        walletAddress?: string;
        certificateId?: string;
    };
}

export interface RegisterUserRequest {
    walletAddress: string;
    role: string;
    adminSignature: string;
    userSignature?: string;
    certificatePem?: string;
}

/**
 * Registra un nuevo usuario con wallet de Metamask y certificado .pem
 */
export const registerUser = async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { walletAddress, role, adminSignature, userSignature, certificatePem } = req.body as RegisterUserRequest;
        
        console.log(`👤 Registrando usuario: ${walletAddress} con rol: ${role}`);

        // Validar datos de entrada
        if (!walletAddress || !role || !adminSignature) {
            res.status(400).json({
                success: false,
                error: 'Datos requeridos: walletAddress, role, adminSignature',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar formato de dirección Ethereum
        if (!ethers.isAddress(walletAddress)) {
            res.status(400).json({
                success: false,
                error: 'Dirección de wallet inválida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar rol
        const validRoles = ['producer', 'factory', 'retailer', 'consumer'];
        if (!validRoles.includes(role.toLowerCase())) {
            res.status(400).json({
                success: false,
                error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Verificar que el solicitante es admin
        const adminUserId = req.user?.userId || 'Admin';
        const adminRole = req.user?.role || 'admin';

        if (adminRole !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Solo administradores pueden registrar usuarios',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validar firma del administrador
        const adminWalletAddress = await validateAdminSignature(walletAddress, role, adminSignature);

        let userCertificate;
        let blockchainResult;

        // Opción 1: Admin proporciona certificado .pem personalizado
        if (certificatePem) {
            console.log('🔐 Usando certificado .pem proporcionado por admin');
            
            // Verificar el certificado
            const isCertValid = await userCertificateService.verifyCertificate(walletAddress, certificatePem);
            if (!isCertValid) {
                res.status(400).json({
                    success: false,
                    error: 'Certificado .pem inválido',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            userCertificate = {
                walletAddress,
                role,
                certificatePem,
                privateKeyPem: 'Administrado externamente',
                createdAt: new Date().toISOString(),
                createdBy: adminWalletAddress,
                mspId: role === 'producer' ? 'Org1MSP' : 'Org2MSP',
                organizationId: role === 'producer' ? 'org1' : 'org2'
            };
        } else {
            // Opción 2: Generar certificado automáticamente
            console.log('🔧 Generando certificado automáticamente');
            
            const certificateRequest: CreateUserCertificateRequest = {
                walletAddress,
                role,
                adminSignature,
                adminWalletAddress
            };

            userCertificate = await userCertificateService.createUserCertificate(certificateRequest);
        }

        // Registrar usuario en blockchain
        try {
            blockchainResult = await hlfService.submitTransaction(
                adminUserId,
                adminRole,
                'UserContractReference:createUser',
                walletAddress,
                role,
                adminSignature
            );
        } catch (blockchainError: any) {
            console.error('❌ Error registrando en blockchain:', blockchainError);
            
            // Si el error es que ya existe, intentar actualizar
            if (blockchainError.message.includes('ya existe')) {
                try {
                    blockchainResult = await hlfService.submitTransaction(
                        adminUserId,
                        adminRole,
                        'UserContractReference:updateUser',
                        walletAddress,
                        role,
                        adminSignature
                    );
                    console.log('✅ Usuario actualizado en blockchain');
                } catch (updateError) {
                    throw blockchainError; // Lanzar el error original
                }
            } else {
                throw blockchainError;
            }
        }

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                walletAddress,
                role,
                createdAt: userCertificate.createdAt,
                createdBy: userCertificate.createdBy,
                mspId: userCertificate.mspId,
                organizationId: userCertificate.organizationId,
                hasCertificate: true
            },
            blockchain: JSON.parse(blockchainResult),
            admin: {
                userId: adminUserId,
                role: adminRole,
                walletAddress: adminWalletAddress,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error registrando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno registrando usuario',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lista todos los usuarios registrados
 */
export const listUsers = async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const adminUserId = req.user?.userId || 'Admin';
        const adminRole = req.user?.role || 'admin';

        if (adminRole !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Solo administradores pueden listar usuarios',
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log('📋 Listando todos los usuarios registrados');

        // Obtener usuarios del blockchain
        const blockchainUsers = await hlfService.evaluateTransaction(
            adminUserId,
            adminRole,
            'UserContractReference:getAllUsers'
        );

        // Obtener certificados del sistema
        const userCertificates = await userCertificateService.listUserCertificates();

        const users = JSON.parse(blockchainUsers);

        // Enriquecer datos con información de certificados
        const enrichedUsers = users.map((user: any) => ({
            ...user,
            hasCertificate: userCertificates.some(cert => cert.includes(user.address.slice(2, 8))),
            certificateCount: userCertificates.filter(cert => cert.includes(user.address.slice(2, 8))).length
        }));

        res.json({
            success: true,
            message: 'Usuarios obtenidos exitosamente',
            users: enrichedUsers,
            totalUsers: enrichedUsers.length,
            certificatesManaged: userCertificates.length,
            admin: {
                userId: adminUserId,
                role: adminRole,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error listando usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuarios',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Obtiene un usuario específico por su dirección
 */
export const getUser = async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { walletAddress } = req.params;
        const adminUserId = req.user?.userId || 'Admin';
        const adminRole = req.user?.role || 'admin';

        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            res.status(400).json({
                success: false,
                error: 'Dirección de wallet inválida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`🔍 Obteniendo usuario: ${walletAddress}`);

        // Obtener usuario del blockchain
        const blockchainUser = await hlfService.evaluateTransaction(
            adminUserId,
            adminRole,
            'UserContractReference:getUser',
            walletAddress
        );

        const user = JSON.parse(blockchainUser);

        // Verificar si tiene certificado
        const userCertificates = await userCertificateService.listUserCertificates();
        const hasCertificate = userCertificates.some(cert => cert.includes(walletAddress.slice(2, 8)));

        res.json({
            success: true,
            message: 'Usuario obtenido exitosamente',
            user: {
                ...user,
                hasCertificate,
                certificateStatus: hasCertificate ? 'active' : 'not_found'
            },
            requester: {
                userId: adminUserId,
                role: adminRole,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuario',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Revoca un usuario y su certificado
 */
export const revokeUser = async (req: AdminAuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { walletAddress } = req.params;
        const { adminSignature } = req.body;

        const adminUserId = req.user?.userId || 'Admin';
        const adminRole = req.user?.role || 'admin';

        if (adminRole !== 'admin') {
            res.status(403).json({
                success: false,
                error: 'Solo administradores pueden revocar usuarios',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            res.status(400).json({
                success: false,
                error: 'Dirección de wallet inválida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (!adminSignature) {
            res.status(400).json({
                success: false,
                error: 'Firma de administrador requerida',
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`🚫 Revocando usuario: ${walletAddress}`);

        // Eliminar usuario del blockchain
        const blockchainResult = await hlfService.submitTransaction(
            adminUserId,
            adminRole,
            'UserContractReference:deleteUser',
            walletAddress,
            adminSignature
        );

        // Revocar certificado
        const certificateRevoked = await userCertificateService.revokeCertificate(walletAddress, adminSignature);

        res.json({
            success: true,
            message: 'Usuario revocado exitosamente',
            user: {
                walletAddress,
                revokedAt: new Date().toISOString(),
                revokedBy: adminUserId
            },
            blockchain: JSON.parse(blockchainResult),
            certificate: {
                revoked: certificateRevoked
            },
            admin: {
                userId: adminUserId,
                role: adminRole,
                mspId: req.user?.mspId || 'Org1MSP'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error revocando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error revocando usuario',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Valida la firma del administrador
 */
async function validateAdminSignature(walletAddress: string, role: string, adminSignature: string): Promise<string> {
    try {
        // Recrear el mensaje que debería haber sido firmado
        const message = `registerUser:${walletAddress}:${role}`;
        const messageHash = ethers.hashMessage(message);
        
        // Recuperar la dirección del firmante
        const signerAddress = ethers.recoverAddress(messageHash, adminSignature);
        
        console.log(`✅ Firma del administrador validada: ${signerAddress}`);
        return signerAddress;
    } catch (error) {
        console.error('❌ Error validando firma del administrador:', error);
        throw new Error('Firma de administrador inválida');
    }
}
/**
 * API Route para obtener y actualizar el perfil del usuario
 * Usa datos reales de localStorage de usuarios registrados y aprobados
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return handleGetProfile(req, res);
    } else if (req.method === 'PUT') {
        return handleUpdateProfile(req, res);
    } else {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
}

/**
 * Obtener perfil del usuario usando datos reales de localStorage
 */
async function handleGetProfile(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token de autorización requerido',
                message: 'Se requiere un token válido para acceder al perfil'
            });
        }

        const token = authHeader.substring(7);
        
        console.log(`📋 Obteniendo perfil para token: ${token.substring(0, 20)}...`);
        
        // Para el administrador principal (hardcoded)
        const adminWallet = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
        
        if (token.includes('admin') || token.includes(adminWallet)) {
            const adminProfile = {
                walletAddress: adminWallet,
                role: 'admin',
                personalInfo: {
                    fullName: 'Administrador Principal',
                    email: 'admin@foodtraceability.com',
                    phone: '+34 900 123 456',
                    organization: 'Food Traceability System',
                    address: 'Calle Principal 123, Madrid',
                    country: 'España'
                },
                businessInfo: {
                    companyName: 'Food Traceability Corp',
                    businessType: 'Tecnología',
                    registrationNumber: 'A-12345678',
                    description: 'Sistema de trazabilidad alimentaria basado en blockchain'
                },
                registrationId: 'admin-001',
                isActive: true,
                accountStatus: 'approved',
                verificationStatus: {
                    emailVerified: true,
                    phoneVerified: true,
                    identityVerified: true,
                    kycCompleted: true
                },
                certificateInfo: {
                    hasX509Certificate: true,
                    certificateSubject: 'CN=Admin,O=FoodTraceability,C=ES',
                    issuer: 'Food Traceability CA',
                    validFrom: '2024-01-01T00:00:00Z',
                    validTo: '2025-12-31T23:59:59Z',
                    serialNumber: 'FT-ADMIN-001'
                },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: new Date().toISOString()
            };
            
            return res.status(200).json({
                success: true,
                profile: adminProfile,
                message: 'Perfil de administrador cargado exitosamente'
            });
        }
        
        // Instrucción especial para que el cliente busque datos reales en localStorage
        return res.status(200).json({
            success: true,
            requiresClientData: true,
            message: 'Datos del perfil deben obtenerse del cliente',
            instructions: 'CLIENT_SHOULD_LOAD_FROM_LOCALSTORAGE'
        });
        
    } catch (error: any) {
        console.error('❌ Error obteniendo perfil:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'No se pudo cargar el perfil del usuario',
            details: error.message
        });
    }
}

/**
 * Actualizar perfil del usuario
 */
async function handleUpdateProfile(req: NextApiRequest, res: NextApiResponse) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token de autorización requerido'
            });
        }

        const updates = req.body;
        
        console.log('📝 Actualizando perfil con datos:', updates);
        
        // Instrucción para que el cliente guarde los cambios en localStorage
        return res.status(200).json({
            success: true,
            requiresClientUpdate: true,
            message: 'Perfil debe actualizarse en el cliente',
            instructions: 'CLIENT_SHOULD_UPDATE_LOCALSTORAGE',
            updates: updates,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        console.error('❌ Error actualizando perfil:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error actualizando perfil',
            message: 'No se pudo actualizar el perfil',
            details: error.message
        });
    }
}
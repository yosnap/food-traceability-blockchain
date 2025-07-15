/**
 * API Route para aprobar solicitudes de registro (admin)
 * Ruta: /api/registration/admin/approve/[requestId]
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('✅ Aprobando solicitud...');
        
        const { requestId } = req.query;
        const { adminNotes } = req.body;
        
        // Extraer token de autorización
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Token de autorización requerido'
            });
        }

        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: 'ID de solicitud requerido'
            });
        }

        // En una aplicación real, esto se haría en la base de datos del servidor
        // Por ahora, simulamos la aprobación y indicamos que el frontend debe manejar el estado
        
        return res.status(200).json({
            success: true,
            message: 'Solicitud aprobada exitosamente',
            data: {
                requestId,
                status: 'approved',
                processedAt: new Date().toISOString(),
                adminNotes: adminNotes || null,
                // Instrucción para el frontend de mover la solicitud a usuarios aprobados
                clientAction: 'moveToApprovedUsers'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error aprobando solicitud:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error procesando aprobación',
            message: 'No se pudo aprobar la solicitud',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
/**
 * API Route para rechazar solicitudes de registro (admin)
 * Ruta: /api/registration/admin/reject/[requestId]
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
        console.log('❌ Rechazando solicitud...');
        
        const { requestId } = req.query;
        const { reason } = req.body;
        
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

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Razón del rechazo es requerida'
            });
        }

        // En una aplicación real, esto se haría en la base de datos del servidor
        // Por ahora, simulamos el rechazo
        
        return res.status(200).json({
            success: true,
            message: 'Solicitud rechazada',
            data: {
                requestId,
                status: 'rejected',
                processedAt: new Date().toISOString(),
                rejectionReason: reason.trim(),
                // Instrucción para el frontend de remover la solicitud
                clientAction: 'removeFromPending'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error rechazando solicitud:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error procesando rechazo',
            message: 'No se pudo rechazar la solicitud',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
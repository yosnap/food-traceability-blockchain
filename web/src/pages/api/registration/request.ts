/**
 * API Route para solicitudes de registro en Next.js
 * Proxy hacia el backend real
 */

import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('📝 Proxy: Enviando solicitud de registro al backend...');
        
        // Hacer proxy de la petición al backend real
        const response = await fetch(`${API_BASE_URL}/registration/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        console.log(`📝 Proxy: Respuesta del backend:`, data);
        
        // Devolver la respuesta del backend al frontend
        res.status(response.status).json(data);

    } catch (error: any) {
        console.error('❌ Proxy: Error conectando con backend:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error conectando con el servidor backend',
            message: 'No se pudo conectar con el servidor de la API',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
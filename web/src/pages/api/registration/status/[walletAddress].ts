/**
 * API Route para verificar estado de solicitud por wallet
 * Proxy hacia el backend real
 */

import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { walletAddress } = req.query;
        
        const targetUrl = `${API_BASE_URL}/registration/status/${walletAddress}`;
        console.log(`🔍 Verificando estado para wallet: ${walletAddress}`);
        console.log(`🔍 Target URL: ${targetUrl}`);
        
        // Hacer proxy de la petición al backend real
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.log(`❌ Backend response not OK: ${response.status} ${response.statusText}`);
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log(`🔍 Proxy: Estado de ${walletAddress}:`, data);
        
        // Devolver la respuesta del backend al frontend
        res.status(response.status).json(data);

    } catch (error: any) {
        console.error('❌ Error verificando estado:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error verificando estado de la solicitud',
            message: 'No se pudo verificar el estado de la solicitud',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
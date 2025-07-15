/**
 * API Route para obtener solicitudes pendientes (admin)
 * Proxy hacia el backend real
 */

import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        console.log('📋 Obteniendo solicitudes pendientes...');
        
        // Extraer token de autorización
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Token de autorización requerido'
            });
        }
        
        // En una aplicación real, esto vendría de una base de datos
        // Por ahora, simulamos que el servidor tiene acceso a las solicitudes pendientes
        
        // IMPORTANTE: En este entorno de demostración, las solicitudes se almacenan en localStorage
        // En producción, estas estarían en la base de datos del servidor
        
        // Para la demostración, el servidor necesita indicar al cliente que use localStorage
        // En la realidad, aquí se consultaría la base de datos del servidor
        console.log('📋 Indicando al cliente que use localStorage para solicitudes...');
        
        // Señalar al cliente que debe usar localStorage (solo para demostración)
        const allRequests = [];
        const clientInstruction = 'USE_LOCALSTORAGE';
        
        return res.status(200).json({
            success: true,
            message: 'Usar localStorage para obtener solicitudes',
            requests: allRequests,
            count: 0, // El cliente calculará el count real desde localStorage
            clientInstruction,
            timestamp: new Date().toISOString()
        });

        // Código original comentado hasta que el backend esté configurado
        /*
        // Hacer proxy de la petición al backend real
        const response = await fetch(`${API_BASE_URL}/registration/admin/requests`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        });

        const data = await response.json();
        
        console.log(`📋 Proxy: ${data.count || 0} solicitudes encontradas`);
        
        // Devolver la respuesta del backend al frontend
        res.status(response.status).json(data);
        */

    } catch (error: any) {
        console.error('❌ Proxy: Error obteniendo solicitudes:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error conectando con el servidor backend',
            message: 'No se pudieron obtener las solicitudes pendientes',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
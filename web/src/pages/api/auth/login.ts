/**
 * API Route para login/autenticación
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
        console.log('🔐 Procesando login...');
        
        const { walletAddress, role, signature, message } = req.body;
        
        // Simulación temporal mientras se configura el backend
        // TODO: Reemplazar con llamada real cuando las rutas estén disponibles
        
        const adminWallet = '0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d';
        
        if (walletAddress === adminWallet && role === 'admin') {
            // Login de admin simulado
            return res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    token: `simulated-admin-token-${Date.now()}`,
                    user: {
                        address: walletAddress,
                        name: 'Administrador Principal',
                        role: 'admin',
                        email: 'admin@foodtraceability.com',
                        phone: '+34123456789',
                        location: {
                            address: 'Dirección Admin',
                            city: 'Madrid',
                            country: 'España',
                            coordinates: { lat: 40.4168, lng: -3.7038 }
                        },
                        isActive: true,
                        isVerified: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });
        } else {
            // Login de usuario normal simulado
            const roleNames = {
                producer: 'Productor Demo',
                factory: 'Procesador Demo',
                distributor: 'Distribuidor Demo',
                retailer: 'Minorista Demo',
                consumer: 'Consumidor Demo'
            };
            
            return res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    token: `simulated-user-token-${Date.now()}`,
                    user: {
                        address: walletAddress,
                        name: roleNames[role as keyof typeof roleNames] || 'Usuario Demo',
                        role: role,
                        email: `${role}@demo.com`,
                        phone: '+34123456789',
                        location: {
                            address: `Dirección ${role}`,
                            city: 'Madrid',
                            country: 'España',
                            coordinates: { lat: 40.4168, lng: -3.7038 }
                        },
                        isActive: true,
                        isVerified: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });
        }

        // Código original comentado hasta que el backend esté configurado
        /*
        // Hacer proxy de la petición al backend real
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        console.log(`🔐 Proxy: Login ${data.success ? 'exitoso' : 'fallido'} para ${req.body.walletAddress}`);
        
        // Devolver la respuesta del backend al frontend
        res.status(response.status).json(data);
        */

    } catch (error: any) {
        console.error('❌ Proxy: Error en login:', error);
        
        res.status(500).json({
            success: false,
            error: 'Error conectando con el servidor backend',
            message: 'No se pudo procesar la autenticación',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
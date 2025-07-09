/**
 * Rutas para descubrimiento de usuarios en la red blockchain
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Mock users data - En producción vendría de la base de datos o blockchain
const mockUsers = {
  producers: [
    {
      id: 'prod-001',
      walletAddress: '0x1234567890123456789012345678901234567890',
      name: 'Finca Orgánica El Valle',
      role: 'PRODUCER',
      organization: 'Cooperativa Valle Verde',
      location: 'San José, Costa Rica',
      email: 'contacto@fincaelvalle.com',
      phone: '+506 2234-5678',
      certificateId: 'User1@org1.example.com',
      isActive: true
    },
    {
      id: 'prod-002',
      walletAddress: '0x2345678901234567890123456789012345678902',
      name: 'Granja Sostenible Los Robles',
      role: 'PRODUCER',
      organization: 'Asociación de Productores Orgánicos',
      location: 'Cartago, Costa Rica',
      email: 'info@granjalosrobles.com',
      phone: '+506 2345-6789',
      certificateId: 'User2@org1.example.com',
      isActive: true
    }
  ],
  processors: [
    {
      id: 'proc-001',
      walletAddress: '0x4567890123456789012345678901234567890124',
      name: 'Procesadora Valle Verde',
      role: 'PROCESSOR',
      organization: 'Valle Verde Processing S.A.',
      location: 'Zona Industrial San José',
      email: 'calidad@valleverde.com',
      phone: '+506 2567-8901',
      certificateId: 'User1@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-002',
      walletAddress: '0x5678901234567890123456789012345678901235',
      name: 'Alimentos Premium S.A.',
      role: 'PROCESSOR',
      organization: 'Grupo Alimentos Premium',
      location: 'Cartago Centro Industrial',
      email: 'produccion@alimentospremium.com',
      phone: '+506 2678-9012',
      certificateId: 'User2@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-003',
      walletAddress: '0x6789012345678901234567890123456789012346',
      name: 'Industrias Naturales',
      role: 'PROCESSOR',
      organization: 'Naturales CR',
      location: 'Heredia Industrial Park',
      email: 'info@industriasnaturales.com',
      phone: '+506 2789-0123',
      certificateId: 'User3@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-004',
      walletAddress: '0xa123456789012345678901234567890123456784',
      name: 'Procesadora Central del Pacífico',
      role: 'PROCESSOR',
      organization: 'Pacífico Processing Group',
      location: 'Puntarenas, Zona Industrial',
      email: 'operaciones@pacificoprocessing.com',
      phone: '+506 2634-7890',
      certificateId: 'User4@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-005',
      walletAddress: '0xb234567890123456789012345678901234567895',
      name: 'Alimentos Orgánicos del Caribe',
      role: 'PROCESSOR',
      organization: 'Caribbean Organic Foods S.A.',
      location: 'Limón, Puerto Industrial',
      email: 'calidad@caribbeanorganic.com',
      phone: '+506 2798-1234',
      certificateId: 'User5@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-006',
      walletAddress: '0xc345678901234567890123456789012345678906',
      name: 'Procesadora Artesanal La Montaña',
      role: 'PROCESSOR',
      organization: 'Grupo Artesanal Montaña Verde',
      location: 'Monteverde, Zona Rural',
      email: 'produccion@lamontana.com',
      phone: '+506 2645-5678',
      certificateId: 'User6@org2.example.com',
      isActive: true
    }
  ],
  distributors: [
    {
      id: 'dist-001',
      walletAddress: '0x7890123456789012345678901234567890123457',
      name: 'Logística Centroamericana',
      role: 'DISTRIBUTOR',
      organization: 'LogiCentro S.A.',
      location: 'San José, Hub Central',
      email: 'operaciones@logicentro.com',
      phone: '+506 2890-1234',
      certificateId: 'User4@org2.example.com',
      isActive: true
    }
  ],
  retailers: [
    {
      id: 'ret-001',
      walletAddress: '0xa012345678901234567890123456789012345680',
      name: 'Supermercados La Familia',
      role: 'RETAILER',
      organization: 'Grupo La Familia',
      location: 'San José, Sucursal Central',
      email: 'compras@lafamilia.com',
      phone: '+506 2123-4567',
      certificateId: 'User7@org2.example.com',
      isActive: true
    }
  ],
  consumers: [
    {
      id: 'cons-001',
      walletAddress: '0xd345678901234567890123456789012345678913',
      name: 'María González',
      role: 'CONSUMER',
      organization: 'Consumidor Individual',
      location: 'San José, Escazú',
      email: 'maria.gonzalez@email.com',
      phone: '+506 8888-1234',
      certificateId: 'Consumer1@org2.example.com',
      isActive: true
    }
  ]
};

/**
 * Obtener usuarios por rol
 */
router.get('/users/by-role/:role', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const normalizedRole = role.toLowerCase();

    // Mapear roles a las claves del objeto mockUsers
    const roleMapping: Record<string, string> = {
      'producer': 'producers',
      'processor': 'processors',
      'distributor': 'distributors',
      'retailer': 'retailers',
      'consumer': 'consumers'
    };

    const usersKey = roleMapping[normalizedRole];
    
    if (!usersKey) {
      res.status(400).json({
        success: false,
        message: 'Rol inválido',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const users = mockUsers[usersKey as keyof typeof mockUsers] || [];

    res.json({
      success: true,
      data: users,
      count: users.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo usuarios por rol:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuarios',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Obtener usuarios disponibles para transferencia según el rol actual
 */
router.get('/users/transfer-recipients', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Definir transiciones permitidas
    const roleTransitions: Record<string, string[]> = {
      'producer': ['processor'],
      'processor': ['distributor'],
      'distributor': ['retailer'],
      'retailer': ['consumer'],
      'consumer': [],
      'admin': ['producer', 'processor', 'distributor', 'retailer', 'consumer']
    };

    const userRole = user.role.toLowerCase();
    const allowedRoles = roleTransitions[userRole] || [];

    // Obtener usuarios para cada rol permitido
    const recipientsByRole: Record<string, any[]> = {};
    
    for (const role of allowedRoles) {
      const roleKey = `${role}s` as keyof typeof mockUsers; // Convertir a plural
      recipientsByRole[role.toUpperCase()] = mockUsers[roleKey] || [];
    }

    res.json({
      success: true,
      data: recipientsByRole,
      currentUserRole: user.role,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo destinatarios para transferencia:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo destinatarios',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Obtener información de un usuario por su dirección de wallet
 */
router.get('/users/by-wallet/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Buscar en todos los usuarios
    const allUsers = [
      ...mockUsers.producers,
      ...mockUsers.processors,
      ...mockUsers.distributors,
      ...mockUsers.retailers,
      ...mockUsers.consumers
    ];

    const user = allUsers.find(u => 
      u.walletAddress.toLowerCase() === address.toLowerCase()
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo usuario por wallet:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuario',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
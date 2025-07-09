/**
 * Mock users con direcciones de wallet reales para el sistema de trazabilidad
 * Estos usuarios simulan participantes reales en la cadena de suministro
 */

export interface MockUser {
  id: string;
  walletAddress: string;
  name: string;
  role: string;
  organization: string;
  location: string;
  email: string;
  phone: string;
  certificateId: string;
  isActive: boolean;
}

// Usuarios por rol con direcciones de wallet únicas
export const mockUsers: Record<string, MockUser[]> = {
  // Productores
  producers: [
    {
      id: 'prod-001',
      walletAddress: '0x1234567890123456789012345678901234567890',
      name: 'Huerta Ecológica Castilla',
      role: 'PRODUCER',
      organization: 'Cooperativa Agrícola de Castilla',
      location: 'Valladolid, España',
      email: 'contacto@huertacastilla.es',
      phone: '+34 98 234-5678',
      certificateId: 'User1@org1.example.com',
      isActive: true
    },
    {
      id: 'prod-002',
      walletAddress: '0x2345678901234567890123456789012345678902',
      name: 'Granja Orgánica Mediterránea',
      role: 'PRODUCER',
      organization: 'Asociación de Productores Ecológicos',
      location: 'Murcia, España',
      email: 'info@granjamediterranea.es',
      phone: '+34 96 845-6789',
      certificateId: 'User2@org1.example.com',
      isActive: true
    },
    {
      id: 'prod-003',
      walletAddress: '0x3456789012345678901234567890123456789013',
      name: 'Invernaderos Solares de Almería',
      role: 'PRODUCER',
      organization: 'Cooperativa Solar Almería',
      location: 'Almería, España',
      email: 'ventas@solarealmeria.es',
      phone: '+34 95 056-7890',
      certificateId: 'User3@org1.example.com',
      isActive: true
    }
  ],

  // Procesadores
  processors: [
    {
      id: 'proc-001',
      walletAddress: '0x4567890123456789012345678901234567890124',
      name: 'Industrias Agroalimentarias Ibéricas',
      role: 'PROCESSOR',
      organization: 'Grupo Ibérico Alimentario S.A.',
      location: 'Madrid, Polígono Industrial',
      email: 'calidad@ibericas.es',
      phone: '+34 91 567-8901',
      certificateId: 'User1@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-002',
      walletAddress: '0x5678901234567890123456789012345678901235',
      name: 'Alimentos Frescos de Cataluña',
      role: 'PROCESSOR',
      organization: 'Catalana de Alimentos S.L.',
      location: 'Barcelona, Zona Franca',
      email: 'produccion@alimentoscatalana.es',
      phone: '+34 93 678-9012',
      certificateId: 'User2@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-003',
      walletAddress: '0x6789012345678901234567890123456789012346',
      name: 'Procesados Naturales de Galicia',
      role: 'PROCESSOR',
      organization: 'Galicia Natural S.A.',
      location: 'Santiago de Compostela, Parque Tecnológico',
      email: 'info@galicianatural.es',
      phone: '+34 98 789-0123',
      certificateId: 'User3@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-004',
      walletAddress: '0xa123456789012345678901234567890123456784',
      name: 'Procesados Mediterráneos S.L.',
      role: 'PROCESSOR',
      organization: 'Grupo Mediterráneo Alimentario',
      location: 'Valencia, Polígono Industrial',
      email: 'operaciones@procesadosmediterraneos.es',
      phone: '+34 96 345-6789',
      certificateId: 'User4@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-005',
      walletAddress: '0xb234567890123456789012345678901234567895',
      name: 'Industrias Agroalimentarias del Norte',
      role: 'PROCESSOR',
      organization: 'Agroalimentarias Norte S.A.',
      location: 'Bilbao, Zona Industrial',
      email: 'calidad@agronorte.es',
      phone: '+34 94 456-7890',
      certificateId: 'User5@org2.example.com',
      isActive: true
    },
    {
      id: 'proc-006',
      walletAddress: '0xc345678901234567890123456789012345678906',
      name: 'Procesadora Artesanal Andaluza',
      role: 'PROCESSOR',
      organization: 'Artesanos de Andalucía',
      location: 'Sevilla, Centro Agroalimentario',
      email: 'produccion@artesanalandaluza.es',
      phone: '+34 95 567-8901',
      certificateId: 'User6@org2.example.com',
      isActive: true
    }
  ],

  // Distribuidores
  distributors: [
    {
      id: 'dist-001',
      walletAddress: '0x7890123456789012345678901234567890123457',
      name: 'Logística Peninsular',
      role: 'DISTRIBUTOR',
      organization: 'Grupo Logístico Peninsular S.A.',
      location: 'Madrid, Hub Central',
      email: 'operaciones@logisticapeninsular.es',
      phone: '+34 91 890-1234',
      certificateId: 'User4@org2.example.com',
      isActive: true
    },
    {
      id: 'dist-002',
      walletAddress: '0x8901234567890123456789012345678901234568',
      name: 'Distribución Nacional Española',
      role: 'DISTRIBUTOR',
      organization: 'DistriEspaña S.L.',
      location: 'Zaragoza, Centro Logístico',
      email: 'logistica@distriespana.es',
      phone: '+34 97 601-2345',
      certificateId: 'User5@org2.example.com',
      isActive: true
    },
    {
      id: 'dist-003',
      walletAddress: '0x9012345678901234567890123456789012345679',
      name: 'Cadena Fría Mediterránea',
      role: 'DISTRIBUTOR',
      organization: 'Mediterránea Cold Chain S.A.',
      location: 'Valencia, Puerto',
      email: 'despachos@cadenafria.es',
      phone: '+34 96 012-3456',
      certificateId: 'User6@org2.example.com',
      isActive: true
    }
  ],

  // Minoristas
  retailers: [
    {
      id: 'ret-001',
      walletAddress: '0xa012345678901234567890123456789012345680',
      name: 'Supermercados Ibéricos',
      role: 'RETAILER',
      organization: 'Cadena Ibérica S.A.',
      location: 'Madrid, Sucursal Central',
      email: 'compras@supermercadosibericos.es',
      phone: '+34 91 123-4567',
      certificateId: 'User7@org2.example.com',
      isActive: true
    },
    {
      id: 'ret-002',
      walletAddress: '0xb123456789012345678901234567890123456791',
      name: 'Hipermercados del Norte',
      role: 'RETAILER',
      organization: 'Grupo Norte Distribución',
      location: 'Bilbao, Gran Vía',
      email: 'gerencia@hipernorte.es',
      phone: '+34 94 234-5678',
      certificateId: 'User8@org2.example.com',
      isActive: true
    },
    {
      id: 'ret-003',
      walletAddress: '0xc234567890123456789012345678901234567802',
      name: 'Mercado Ecológico Andaluz',
      role: 'RETAILER',
      organization: 'Ecológicos de Andalucía S.L.',
      location: 'Sevilla, Centro Comercial',
      email: 'info@ecolandaluz.es',
      phone: '+34 95 345-6789',
      certificateId: 'User9@org2.example.com',
      isActive: true
    }
  ],

  // Consumidores (ejemplo)
  consumers: [
    {
      id: 'cons-001',
      walletAddress: '0xd345678901234567890123456789012345678913',
      name: 'María González López',
      role: 'CONSUMER',
      organization: 'Consumidor Individual',
      location: 'Madrid, Chamberí',
      email: 'maria.gonzalez@email.es',
      phone: '+34 66 888-1234',
      certificateId: 'Consumer1@org2.example.com',
      isActive: true
    },
    {
      id: 'cons-002',
      walletAddress: '0xe456789012345678901234567890123456789024',
      name: 'Carlos Rodríguez Fernández',
      role: 'CONSUMER',
      organization: 'Consumidor Individual',
      location: 'Barcelona, Eixample',
      email: 'carlos.rodriguez@email.es',
      phone: '+34 69 888-2345',
      certificateId: 'Consumer2@org2.example.com',
      isActive: true
    },
    {
      id: 'cons-003',
      walletAddress: '0xf567890123456789012345678901234567890135',
      name: 'Ana Morales García',
      role: 'CONSUMER',
      organization: 'Consumidor Individual',
      location: 'Sevilla, Triana',
      email: 'ana.morales@email.es',
      phone: '+34 67 888-3456',
      certificateId: 'Consumer3@org2.example.com',
      isActive: true
    }
  ]
};

// Función helper para obtener usuarios por rol
export function getUsersByRole(role: string): MockUser[] {
  switch (role.toUpperCase()) {
    case 'PRODUCER':
      return mockUsers.producers;
    case 'PROCESSOR':
      return mockUsers.processors;
    case 'DISTRIBUTOR':
      return mockUsers.distributors;
    case 'RETAILER':
      return mockUsers.retailers;
    case 'CONSUMER':
      return mockUsers.consumers;
    default:
      return [];
  }
}

// Función para obtener un usuario por wallet address
export function getUserByWalletAddress(address: string): MockUser | undefined {
  const allUsers = [
    ...mockUsers.producers,
    ...mockUsers.processors,
    ...mockUsers.distributors,
    ...mockUsers.retailers,
    ...mockUsers.consumers
  ];
  
  return allUsers.find(user => 
    user.walletAddress.toLowerCase() === address.toLowerCase()
  );
}

// Función para obtener un usuario por ID
export function getUserById(id: string): MockUser | undefined {
  const allUsers = [
    ...mockUsers.producers,
    ...mockUsers.processors,
    ...mockUsers.distributors,
    ...mockUsers.retailers,
    ...mockUsers.consumers
  ];
  
  return allUsers.find(user => user.id === id);
}

// Función para obtener usuarios disponibles para transferencia según el rol actual
export function getAvailableRecipientsForRole(fromRole: string): Record<string, MockUser[]> {
  const roleTransitions: Record<string, string[]> = {
    'PRODUCER': ['PROCESSOR'],
    'PROCESSOR': ['DISTRIBUTOR'],
    'DISTRIBUTOR': ['RETAILER'],
    'RETAILER': ['CONSUMER'],
    'CONSUMER': [],
    'ADMIN': ['PRODUCER', 'PROCESSOR', 'DISTRIBUTOR', 'RETAILER', 'CONSUMER']
  };

  const availableRoles = roleTransitions[fromRole.toUpperCase()] || [];
  const recipients: Record<string, MockUser[]> = {};

  availableRoles.forEach(role => {
    recipients[role] = getUsersByRole(role);
  });

  return recipients;
}
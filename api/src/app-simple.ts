/**
 * Servidor simple de la API Food Traceability sin Fabric
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:19006'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.url} - IP: ${req.ip}`);
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const emoji = status >= 400 ? '❌' : '✅';
        console.log(`${emoji} ${status} ${req.method} ${req.url} - ${duration}ms`);
    });
    
    next();
});

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

// Test básico
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Food Traceability API está funcionando',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
            api: {
                status: 'running',
                port: PORT
            },
            fabric: {
                status: 'disabled',
                note: 'Running in simple mode without Fabric'
            }
        }
    });
});

// Info del sistema
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Food Traceability API',
        version: '1.0.0',
        description: 'API para trazabilidad de alimentos con Hyperledger Fabric',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        blockchain: {
            network: 'Hyperledger Fabric',
            channel: process.env.CHANNEL_NAME || 'mychannel',
            chaincode: process.env.CHAINCODE_NAME || 'foodtraceability',
            status: 'disabled'
        }
    });
});

// ==========================================
// RUTAS MOCK PARA TESTING
// ==========================================

// Mock auth middleware
const mockAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de autorización requerido'
        });
    }
    
    // Mock user data based on token
    const roleMap: any = {
        'producer-token': 'PRODUCER',
        'processor-token': 'PROCESSOR',
        'distributor-token': 'DISTRIBUTOR',
        'retailer-token': 'RETAILER',
        'consumer-token': 'CONSUMER',
        'admin-token': 'ADMIN'
    };
    
    const role = roleMap[token];
    if (!role) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
    
    req.user = {
        address: '0x1234567890123456789012345678901234567890',
        name: `Usuario ${role}`,
        role: role
    };
    
    next();
};

// User endpoints
app.post('/api/users/register', (req, res) => {
    res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
            address: req.body.address,
            name: req.body.name,
            role: req.body.role
        }
    });
});

app.get('/api/users/me', mockAuth, (req: any, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

app.put('/api/users/me', mockAuth, (req: any, res) => {
    res.json({
        success: true,
        message: 'Perfil actualizado',
        data: { ...req.user, ...req.body }
    });
});

app.get('/api/users/me/notifications', mockAuth, (req, res) => {
    res.json({
        success: true,
        data: {
            enableNotifications: true,
            notificationDays: 2,
            enableEmailNotifications: true,
            enablePushNotifications: true
        }
    });
});

app.put('/api/users/me/notifications', mockAuth, (req, res) => {
    res.json({
        success: true,
        message: 'Configuración de notificaciones actualizada',
        data: req.body
    });
});

// Food endpoints
app.get('/api/food/ping', mockAuth, (req, res) => {
    res.json({
        success: false,
        message: 'Chaincode no disponible en modo simple',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/food/products', mockAuth, (req: any, res) => {
    if (!['PRODUCER', 'PROCESSOR'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Permisos insuficientes'
        });
    }
    
    res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: {
            id: req.body.id,
            ...req.body,
            owner: req.user.address,
            createdAt: new Date().toISOString()
        }
    });
});

app.get('/api/food/products/:id', mockAuth, (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.params.id,
            name: 'Producto de ejemplo',
            category: 'VEGETABLES',
            expirationDate: '2025-07-05',
            owner: '0x1234567890123456789012345678901234567890'
        }
    });
});

app.get('/api/food/products', mockAuth, (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'PROD-001',
                name: 'Producto de ejemplo 1',
                category: 'VEGETABLES',
                expirationDate: '2025-07-05'
            },
            {
                id: 'PROD-002',
                name: 'Producto de ejemplo 2',
                category: 'FRUITS',
                expirationDate: '2025-07-03'
            }
        ]
    });
});

app.get('/api/food/expiring', mockAuth, (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'PROD-002',
                name: 'Producto de ejemplo 2',
                category: 'FRUITS',
                expirationDate: '2025-07-03',
                daysUntilExpiration: 4
            }
        ]
    });
});

app.get('/api/food/stats', mockAuth, (req, res) => {
    res.json({
        success: true,
        data: {
            totalProducts: 2,
            expiringProducts: 1,
            categories: {
                VEGETABLES: 1,
                FRUITS: 1
            }
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.originalUrl} no encontrada`,
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 Food Traceability API Simple iniciada');
    console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
    console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log('💡 Modo simple sin Fabric habilitado');
});

export default app;
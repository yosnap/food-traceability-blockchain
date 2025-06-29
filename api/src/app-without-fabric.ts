/**
 * Servidor API sin conexión automática a Fabric (para pruebas)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Iniciando Food Traceability API (sin Fabric)...');

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

// CORS configurado para desarrollo
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:19006'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
};

app.use(cors(corsOptions));

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests
app.use(requestLogger);

// Trust proxy
app.set('trust proxy', 1);

// Rutas básicas
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
            status: 'disconnected (test mode)'
        }
    });
});

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
                status: 'disconnected',
                note: 'Running in test mode without Fabric connection'
            }
        }
    });
});

app.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API funcionando correctamente (modo test)',
        timestamp: new Date().toISOString()
    });
});

// Catch-all para 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.originalUrl} no encontrada`,
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Función para iniciar servidor (sin Fabric)
async function startServer() {
    try {
        console.log('🚀 Iniciando servidor en modo test (sin Fabric)...');
        
        // Iniciar servidor HTTP directamente
        const server = app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`✅ Servidor corriendo en puerto ${PORT}`);
            console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`ℹ️  Info del sistema: http://localhost:${PORT}/api/info`);
            console.log(`🧪 Test: http://localhost:${PORT}/test`);
        });

        // Configurar graceful shutdown
        const gracefulShutdown = (signal: string) => {
            console.log(`\n📤 Recibida señal ${signal}. Cerrando servidor...`);
            
            server.close(() => {
                console.log('🔌 Servidor HTTP cerrado');
                console.log('👋 Servidor cerrado correctamente');
                process.exit(0);
            });
            
            // Forzar cierre después de 10 segundos
            setTimeout(() => {
                console.error('⚠️  Forzando cierre del servidor...');
                process.exit(1);
            }, 10000);
        };

        // Listeners para señales de sistema
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();

export default app;
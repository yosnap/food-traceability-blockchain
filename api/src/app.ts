/**
 * Servidor principal de la API Food Traceability
 * Conecta aplicaciones web y móvil con Hyperledger Fabric
 */

// Cargar variables de entorno PRIMERO
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🔧 DEBUG: .env path:', path.resolve(__dirname, '../.env'));
console.log('🔧 DEBUG: CHAINCODE_NAME from env:', process.env.CHAINCODE_NAME);

console.log('🔧 DEBUG: Importando express...');
// Ahora importar el resto
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/authMiddleware.js';
console.log('🔧 DEBUG: Importando FabricGatewayService...');
import { fabricGatewayService } from './services/FabricGatewayService.js';
console.log('🔧 DEBUG: FabricGatewayService importado exitosamente');

// Importar rutas
console.log('🔧 DEBUG: Importando rutas...');
import foodRoutes from './routes/foodRoutes.js';
console.log('🔧 DEBUG: foodRoutes importado');
import foodRoutesGateway from './routes/foodRoutesGateway.js';
console.log('🔧 DEBUG: foodRoutesGateway importado');
import userRoutes from './routes/userRoutes.js';
console.log('🔧 DEBUG: userRoutes importado');
import healthRoutes from './routes/healthRoutes.js';
console.log('🔧 DEBUG: healthRoutes importado');
import testRoutes from './routes/testRoutes.js';
console.log('🔧 DEBUG: testRoutes importado');
import authRoutes from './routes/authRoutes.js';
console.log('🔧 DEBUG: authRoutes importado');
import hlfRoutes from './routes/hlfRoutes.js';
console.log('🔧 DEBUG: hlfRoutes importado');

console.log('🔧 DEBUG: Creando aplicación Express...');
// Crear aplicación Express
const app = express();
console.log('🔧 DEBUG: Express creado');
const PORT = parseInt(process.env.PORT || '3001', 10);
console.log('🔧 DEBUG: PORT configurado:', PORT);

// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
console.log('🔧 DEBUG: Configurando middleware...');

console.log('🔧 DEBUG: Configurando helmet...');
// Middleware de seguridad simplificado temporalmente
app.use(helmet());
console.log('🔧 DEBUG: Helmet configurado');

// CORS configurado para desarrollo y producción
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:19006'], // Next.js, otra app, Expo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// Parsing de JSON y URL encoded
app.use(express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests
app.use(requestLogger);

// Trust proxy (para deployment detrás de nginx/cloudflare)
app.set('trust proxy', 1);

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
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

// Health check y status
app.use('/api/health', healthRoutes);

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);

// Rutas de prueba para demostrar firmas dinámicas
app.use('/api/test', testRoutes);

// Información pública del sistema
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
            chaincode: process.env.CHAINCODE_NAME || 'foodtraceability'
        }
    });
});

// ==========================================
// RUTAS PROTEGIDAS (con autenticación)
// ==========================================

// Aplicar middleware de autenticación solo a rutas que lo necesiten
// Las rutas de /api/auth son públicas (login, logout)

// Rutas de usuarios (algunas públicas, otras protegidas)
app.use('/api/users', userRoutes);

// Rutas de productos (todas protegidas)
// Usar las nuevas rutas Gateway que incluyen autenticación por roles
app.use('/api/food', authMiddleware, foodRoutesGateway);

// Rutas HLF con autenticación X.509 (siguiendo repositorio de referencia)
app.use('/api/hlf', hlfRoutes);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Ruta catch-all para 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.originalUrl} no encontrada`,
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use(errorHandler);

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================

/**
 * Inicializa la conexión con Fabric y arranca el servidor
 */
async function startServer() {
    try {
        console.log('🚀 Iniciando Food Traceability API...');

        // Inicializar Fabric en background (no bloquear el servidor)
        console.log('📡 Fabric se inicializará en segundo plano...');

        // Intentar conectar en background sin bloquear
        setImmediate(async () => {
            try {
                console.log('🔧 Inicializando Fabric Gateway...');
                await fabricGatewayService.initialize();
                console.log('✅ Conexión con Fabric Gateway establecida');

                try {
                    const pingResult = await fabricGatewayService.ping();
                    console.log('✅ Chaincode funcionando:', pingResult);
                } catch (chaincodeError: any) {
                    console.log('⚠️  Chaincode no disponible:', chaincodeError.message);
                }
            } catch (fabricError: any) {
                console.log('⚠️  Fabric Gateway no disponible:', fabricError.message);
                console.log('🔧 API funcionando sin conexión a blockchain');
            }
        });

        // Iniciar servidor HTTP en todas las interfaces (0.0.0.0)
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
            console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API disponible en:`);
            console.log(`   • Local: http://localhost:${PORT}/api`);
            console.log(`   • Red local: http://192.168.1.67:${PORT}/api`);
            console.log(`📊 Health check: http://192.168.1.67:${PORT}/api/health`);
            console.log(`📱 Para móvil: http://192.168.1.67:${PORT}`);
        });

        // Configurar graceful shutdown
        const gracefulShutdown = (signal: string) => {
            console.log(`\n📤 Recibida señal ${signal}. Cerrando servidor...`);

            server.close(async () => {
                console.log('🔌 Servidor HTTP cerrado');

                try {
                    await fabricGatewayService.disconnect();
                    console.log('📡 Conexión con Fabric Gateway cerrada');
                } catch (error) {
                    console.error('❌ Error al cerrar conexión con Fabric Gateway:', error);
                }

                console.log('👋 Servidor cerrado correctamente');
                process.exit(0);
            });

            // Forzar cierre después de 30 segundos
            setTimeout(() => {
                console.error('⚠️  Forzando cierre del servidor...');
                process.exit(1);
            }, 30000);
        };

        // Listeners para señales de sistema
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Manejo de errores no capturados
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            // No cerrar el proceso, solo loggear
        });

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// ==========================================
// VARIABLES DE ENTORNO REQUERIDAS
// ==========================================

const requiredEnvVars = [
    'FABRIC_NETWORK_PATH',
    'FABRIC_WALLET_PATH',
    'FABRIC_USER_ID',
    'CHANNEL_NAME',
    'CHAINCODE_NAME'
];

// Verificar variables de entorno en producción
if (process.env.NODE_ENV === 'production') {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('❌ Variables de entorno faltantes:', missingVars);
        console.error('💡 Crea un archivo .env con las variables requeridas');
        process.exit(1);
    }
}

// Iniciar servidor si este archivo se ejecuta directamente
const isMainModule = process.argv[1] && process.argv[1].endsWith('app.ts') || process.argv[1] && process.argv[1].endsWith('app.js');
if (isMainModule) {
    console.log('🔧 DEBUG: Iniciando servidor desde archivo principal...');
    startServer();
} else {
    console.log('🔧 DEBUG: Archivo importado como módulo, no iniciando servidor automáticamente');
}

export default app;

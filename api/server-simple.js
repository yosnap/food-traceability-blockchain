/**
 * Servidor simplificado para probar la API básica
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Iniciando Food Traceability API simplificada...');

// Middleware básico
app.use(helmet());
app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Rutas básicas de prueba
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

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Servidor Express funcionando correctamente',
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

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Error:', error);
    res.status(500).json({
        success: false,
        error: {
            message: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        }
    });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🔗 API info: http://localhost:${PORT}/api/info`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log('👋 Presiona Ctrl+C para detener');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n📤 Recibida señal SIGTERM. Cerrando servidor...');
    server.close(() => {
        console.log('👋 Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n📤 Recibida señal SIGINT. Cerrando servidor...');
    server.close(() => {
        console.log('👋 Servidor cerrado correctamente');
        process.exit(0);
    });
});

export default app;
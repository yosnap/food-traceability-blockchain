/**
 * Script de prueba para verificar conexión con Fabric
 */

import express from 'express';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Iniciando test de conexión...');

// Ruta de prueba simple
app.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check básico
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    console.log(`✅ Servidor de prueba corriendo en puerto ${PORT}`);
    console.log(`🔗 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Cerrar después de 30 segundos para evitar que se cuelgue
setTimeout(() => {
    console.log('⏰ Cerrando servidor de prueba...');
    server.close(() => {
        console.log('👋 Servidor cerrado');
        process.exit(0);
    });
}, 30000);
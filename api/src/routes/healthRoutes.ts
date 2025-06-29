/**
 * Rutas de health check y diagnóstico del sistema
 */

import { Router, Request, Response } from 'express';
import { fabricService } from '../services/FabricService.js';

const router = Router();

/**
 * GET /api/health
 * Health check básico del sistema
 */
router.get('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        // Verificar conexión con Fabric
        let fabricStatus = 'disconnected';
        let fabricError = null;
        
        try {
            if (fabricService.isConnected()) {
                await fabricService.ping();
                fabricStatus = 'connected';
            }
        } catch (error: any) {
            fabricError = error.message;
            fabricStatus = 'error';
        }

        const responseTime = Date.now() - startTime;
        const isHealthy = fabricStatus === 'connected';

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                api: {
                    status: 'running',
                    port: process.env.PORT || 3001
                },
                fabric: {
                    status: fabricStatus,
                    error: fabricError,
                    network: process.env.CHANNEL_NAME || 'mychannel',
                    chaincode: process.env.CHAINCODE_NAME || 'foodtraceability'
                }
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024)
            }
        });

    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            error: error.message,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

/**
 * GET /api/health/detailed
 * Health check detallado con más información
 */
router.get('/detailed', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        // Verificar servicios
        const services = {
            api: { status: 'running', details: 'Express server active' },
            fabric: { status: 'unknown', details: 'Testing connection...' }
        };

        // Test de conexión con Fabric
        try {
            if (fabricService.isConnected()) {
                const pingResult = await fabricService.ping();
                services.fabric = {
                    status: 'connected',
                    details: `Chaincode response: ${pingResult}`
                };
            } else {
                services.fabric = {
                    status: 'disconnected',
                    details: 'Fabric service not initialized'
                };
            }
        } catch (error: any) {
            services.fabric = {
                status: 'error',
                details: error.message
            };
        }

        const responseTime = Date.now() - startTime;
        const isHealthy = services.fabric.status === 'connected';

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid,
                memory: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024)
                },
                cpu: process.cpuUsage()
            },
            configuration: {
                port: process.env.PORT || 3001,
                nodeEnv: process.env.NODE_ENV || 'development',
                fabricNetwork: process.env.CHANNEL_NAME || 'mychannel',
                chaincodeName: process.env.CHAINCODE_NAME || 'foodtraceability'
            }
        });

    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTime: `${responseTime}ms`,
            error: {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

/**
 * GET /api/health/ready
 * Readiness probe para Kubernetes/Docker
 */
router.get('/ready', async (req: Request, res: Response) => {
    try {
        // Verificar que todos los servicios críticos estén listos
        const isReady = fabricService.isConnected();
        
        if (isReady) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                message: 'Application is ready to serve requests'
            });
        } else {
            res.status(503).json({
                status: 'not-ready',
                timestamp: new Date().toISOString(),
                message: 'Application is not ready to serve requests'
            });
        }
    } catch (error: any) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            message: error.message
        });
    }
});

/**
 * GET /api/health/live
 * Liveness probe para Kubernetes/Docker
 */
router.get('/live', (req: Request, res: Response) => {
    // Si el proceso está corriendo, está "alive"
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Application is alive'
    });
});

export default router;
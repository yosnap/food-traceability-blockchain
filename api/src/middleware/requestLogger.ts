/**
 * Middleware de logging de requests
 */

import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Log de request entrante
    console.log(`📥 ${timestamp} ${req.method} ${req.url} - IP: ${req.ip}`);
    
    // Log adicional para requests con body
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
        console.log(`📋 Body:`, {
            ...req.body,
            // Ocultar campos sensibles
            password: req.body.password ? '[HIDDEN]' : undefined,
            token: req.body.token ? '[HIDDEN]' : undefined,
            privateKey: req.body.privateKey ? '[HIDDEN]' : undefined
        });
    }

    // Override del res.json para loggear responses
    const originalJson = res.json;
    res.json = function(body: any) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Log de response
        const logLevel = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️ ' : '✅';
        console.log(`📤 ${logLevel} ${statusCode} ${req.method} ${req.url} - ${duration}ms`);
        
        // Log de errores
        if (statusCode >= 400 && body?.error) {
            console.log(`🔍 Error details:`, body.error.message);
        }
        
        return originalJson.call(this, body);
    };

    next();
};
/**
 * Middleware de manejo de errores
 */

import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}

export const errorHandler = (
    error: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Error interno del servidor';
    let details = error.details || null;

    // Log del error para debugging
    console.error('❌ Error capturado:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Errores específicos de Fabric
    if (error.message.includes('chaincode')) {
        statusCode = 503;
        message = 'Error de conexión con blockchain';
        details = process.env.NODE_ENV === 'development' ? error.message : null;
    }

    // Errores de validación
    if (error.message.includes('inválido') || error.message.includes('invalid')) {
        statusCode = 400;
    }

    // Errores de permisos
    if (error.message.includes('permisos') || error.message.includes('denegado')) {
        statusCode = 403;
    }

    // Errores de no encontrado
    if (error.message.includes('no existe') || error.message.includes('not found')) {
        statusCode = 404;
    }

    // Respuesta al cliente
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            code: error.code || 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? details : null,
            timestamp: new Date().toISOString(),
            path: req.path
        }
    });
};
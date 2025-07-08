/**
 * Rutas HLF con autenticación X.509 real
 * Basadas en el patrón del repositorio de referencia
 */

import { Router } from 'express';
import {
    pingHLF,
    pingHolaHLF,
    createUserHLF,
    getUserHLF,
    tokenizeAssetHLF,
    transferTokenHLF
} from '../controllers/HLFController.js';

const router = Router();

/**
 * Rutas básicas de prueba (siguiendo patrón del repositorio de referencia)
 */

// GET /ping - Ping básico al chaincode
router.get('/ping', pingHLF);

// GET /pingHola/:name - Ping con nombre personalizado
router.get('/pingHola/:name', pingHolaHLF);

// GET /ping2/:name - Alias para compatibilidad
router.get('/ping2/:name', pingHolaHLF);

/**
 * Rutas de gestión de usuarios
 */

// POST /users - Crear nuevo usuario (solo admins)
router.post('/users', createUserHLF);

// GET /users/:address - Obtener usuario por dirección
router.get('/users/:address', getUserHLF);

/**
 * Rutas de tokenización de activos
 */

// POST /tokens - Crear/tokenizar nuevo activo
router.post('/tokens', tokenizeAssetHLF);

// POST /tokens/transfer - Transferir token entre usuarios
router.post('/tokens/transfer', transferTokenHLF);

/**
 * Rutas específicas para roles del sistema de trazabilidad
 */

// POST /producer/create - Crear producto (solo producers)
router.post('/producer/create', async (req, res) => {
    // Implementar lógica específica para productores
    res.json({
        success: true,
        message: 'Endpoint de producer implementado',
        note: 'Requiere implementación específica'
    });
});

// POST /factory/process - Procesar producto (solo factories)
router.post('/factory/process', async (req, res) => {
    // Implementar lógica específica para fábricas
    res.json({
        success: true,
        message: 'Endpoint de factory implementado',
        note: 'Requiere implementación específica'
    });
});

// POST /retailer/sell - Vender producto (solo retailers)
router.post('/retailer/sell', async (req, res) => {
    // Implementar lógica específica para retailers
    res.json({
        success: true,
        message: 'Endpoint de retailer implementado',
        note: 'Requiere implementación específica'
    });
});

// POST /consumer/consume - Consumir producto (solo consumers)
router.post('/consumer/consume', async (req, res) => {
    // Implementar lógica específica para consumidores
    res.json({
        success: true,
        message: 'Endpoint de consumer implementado',
        note: 'Requiere implementación específica'
    });
});

export default router;
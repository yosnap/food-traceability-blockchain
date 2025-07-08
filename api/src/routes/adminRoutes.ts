/**
 * Rutas administrativas para importación masiva y reset
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fabricGatewayService } from '../services/FabricGatewayService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Configurar multer para subida de archivos
const upload = multer({ dest: 'uploads/' });

interface CSVProduct {
    name: string;
    category: string;
    description: string;
    quantity: string;
    weight: string;
    productionDate: string;
    expirationDate: string;
    batchNumber: string;
    variety: string;
    farmName: string;
    farmLocation: string;
    temperature: string;
    humidity: string;
    certifications: string;
    allergens: string;
}

/**
 * Importar productos desde CSV
 */
router.post('/import-csv', authMiddleware, upload.single('csvFile'), async (req: Request, res: Response) => {
    try {
        const user = req.user;
        
        // Verificar que sea admin
        if (user?.role !== 'ADMIN' && user?.role !== 'PRODUCER') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores y productores pueden importar productos'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Archivo CSV requerido'
            });
        }

        const products: CSVProduct[] = [];
        const results: any[] = [];
        const errors: any[] = [];

        // Leer archivo CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file!.path)
                .pipe(csv())
                .on('data', (row: CSVProduct) => {
                    products.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`📊 Importando ${products.length} productos desde CSV...`);

        // Procesar cada producto
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            try {
                // Generar ID único
                const productId = `PROD-${Date.now()}-${i}`;
                
                // Parsear certifications y allergens
                const certifications = product.certifications ? 
                    product.certifications.split(',').map(s => s.trim()) : [];
                const allergens = product.allergens ? 
                    product.allergens.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

                // Crear datos de origen
                const originData = JSON.stringify({
                    producer: user.name || 'Importador CSV',
                    farm: product.farmName,
                    location: {
                        address: product.farmLocation,
                        city: product.farmLocation.split(',')[0] || 'Ciudad',
                        state: product.farmLocation.split(',')[1] || 'Provincia',
                        country: 'España',
                        postalCode: '00000'
                    },
                    harvestDate: product.productionDate,
                    certifications: certifications,
                    lotNumber: product.batchNumber,
                    variety: product.variety
                });

                // Crear datos de almacenamiento
                const storageConditions = JSON.stringify({
                    temperature: `${product.temperature}°C`,
                    humidity: `${product.humidity}%`,
                    lightExposure: 'Controlada',
                    storageType: 'Refrigerado'
                });

                // Crear producto en blockchain
                const result = await fabricGatewayService.createFoodAsset(
                    user.userId || 'ImporterUser',
                    {
                        id: productId,
                        batchNumber: product.batchNumber,
                        name: product.name,
                        category: product.category as any,
                        description: product.description,
                        quantity: parseInt(product.quantity),
                        productionDate: product.productionDate,
                        expirationDate: product.expirationDate,
                        originData: originData,
                        storageConditionsData: storageConditions,
                        allergens: JSON.stringify(allergens),
                        weight: parseFloat(product.weight.replace('kg', '')),
                        volume: 0,
                        brand: product.farmName
                    }
                );

                results.push({
                    index: i + 1,
                    productId,
                    name: product.name,
                    status: 'SUCCESS',
                    result: result
                });

                console.log(`✅ ${i + 1}/${products.length}: ${product.name} creado exitosamente`);

            } catch (error: any) {
                errors.push({
                    index: i + 1,
                    name: product.name,
                    error: error.message
                });
                console.error(`❌ ${i + 1}/${products.length}: Error creando ${product.name}:`, error.message);
            }

            // Pequeña pausa para no sobrecargar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Limpiar archivo temporal
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `Importación completada: ${results.length} éxitos, ${errors.length} errores`,
            data: {
                totalProcessed: products.length,
                successful: results.length,
                failed: errors.length,
                results: results,
                errors: errors
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error en importación CSV:', error);
        
        // Limpiar archivo temporal si existe
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Error en importación CSV',
            error: error.message
        });
    }
});

/**
 * Importar productos desde el CSV predefinido
 */
router.post('/import-demo-products', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.user;
        
        // Verificar que sea admin o productor
        if (user?.role !== 'ADMIN' && user?.role !== 'PRODUCER') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores y productores pueden importar productos'
            });
        }

        const csvPath = path.join(process.cwd(), '..', 'productos_demo.csv');
        
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({
                success: false,
                message: 'Archivo productos_demo.csv no encontrado'
            });
        }

        const products: CSVProduct[] = [];
        const results: any[] = [];
        const errors: any[] = [];

        // Leer archivo CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row: CSVProduct) => {
                    products.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`📊 Importando ${products.length} productos demo...`);

        // Limitar a los primeros 10 para demo rápido
        const productsToImport = products.slice(0, 10);

        for (let i = 0; i < productsToImport.length; i++) {
            const product = productsToImport[i];
            
            try {
                const productId = `DEMO-${Date.now()}-${i}`;
                
                const certifications = product.certifications ? 
                    product.certifications.split(',').map(s => s.trim()) : [];
                const allergens = product.allergens ? 
                    product.allergens.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

                const originData = JSON.stringify({
                    producer: user.name || 'Productor Demo',
                    farm: product.farmName,
                    location: {
                        address: product.farmLocation,
                        city: product.farmLocation.split(',')[0] || 'Ciudad',
                        state: product.farmLocation.split(',')[1] || 'Provincia',
                        country: 'España',
                        postalCode: '00000'
                    },
                    harvestDate: product.productionDate,
                    certifications: certifications,
                    lotNumber: product.batchNumber,
                    variety: product.variety
                });

                const storageConditions = JSON.stringify({
                    temperature: `${product.temperature}°C`,
                    humidity: `${product.humidity}%`,
                    lightExposure: 'Controlada',
                    storageType: 'Refrigerado'
                });

                const result = await fabricGatewayService.createFoodAsset(
                    user.userId || 'DemoUser',
                    {
                        id: productId,
                        batchNumber: product.batchNumber,
                        name: product.name,
                        category: product.category as any,
                        description: product.description,
                        quantity: parseInt(product.quantity),
                        productionDate: product.productionDate,
                        expirationDate: product.expirationDate,
                        originData: originData,
                        storageConditionsData: storageConditions,
                        allergens: JSON.stringify(allergens),
                        weight: parseFloat(product.weight.replace('kg', '')),
                        volume: 0,
                        brand: product.farmName
                    }
                );

                results.push({
                    index: i + 1,
                    productId,
                    name: product.name,
                    status: 'SUCCESS'
                });

                console.log(`✅ Demo ${i + 1}/${productsToImport.length}: ${product.name} creado`);

            } catch (error: any) {
                errors.push({
                    index: i + 1,
                    name: product.name,
                    error: error.message
                });
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.json({
            success: true,
            message: `Productos demo importados: ${results.length} éxitos, ${errors.length} errores`,
            data: {
                totalProcessed: productsToImport.length,
                successful: results.length,
                failed: errors.length,
                results: results,
                errors: errors
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error importando productos demo:', error);
        res.status(500).json({
            success: false,
            message: 'Error importando productos demo',
            error: error.message
        });
    }
});

/**
 * Reset de datos (solo para desarrollo)
 */
router.post('/reset-blockchain', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = req.user;
        
        if (user?.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores pueden resetear la blockchain'
            });
        }

        // Esta función requeriría implementar un método de reset en el chaincode
        // Por ahora, devolver instrucciones
        res.json({
            success: true,
            message: 'Para resetear completamente, ejecuta los siguientes comandos:',
            instructions: [
                'cd fabric-samples/test-network',
                './network.sh down',
                'docker volume prune -f',
                './network.sh up createChannel -ca -s couchdb',
                './network.sh deployCC -ccn food-traceability -ccp ../../../chaincode -ccl typescript'
            ],
            note: 'Esto eliminará todos los datos y reiniciará la red limpia'
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Error en reset',
            error: error.message
        });
    }
});

export default router;
/**
 * Script para probar la API
 */

import http from 'http';

function testEndpoint(path, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 3001,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        console.log(`🧪 Probando ${description}: http://localhost:3001${path}`);

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ ${description} - Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    console.log(`📄 Response:`, JSON.stringify(json, null, 2));
                } catch (e) {
                    console.log(`📄 Response:`, data);
                }
                console.log('---');
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${description} - Error: ${err.message}`);
            console.log('---');
            resolve();
        });

        req.on('timeout', () => {
            console.log(`⏰ ${description} - Timeout`);
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('🚀 Iniciando pruebas de API...\n');

    await testEndpoint('/test', 'Test básico');
    await testEndpoint('/api/health', 'Health check');
    await testEndpoint('/api/info', 'Información del sistema');
    await testEndpoint('/api/nonexistent', 'Ruta inexistente (404)');
    
    console.log('🏁 Pruebas completadas');
}

runTests().catch(console.error);
console.log('🚀 Iniciando API de prueba...');

const PORT = 3001;

// Servidor HTTP simple
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        message: 'API de prueba funcionando',
        timestamp: new Date().toISOString(),
        port: PORT
    }));
});

server.listen(PORT, () => {
    console.log(`✅ Servidor de prueba ejecutándose en http://localhost:${PORT}`);
});

// Mantener el proceso vivo
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

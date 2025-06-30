// Test mínimo para identificar el problema
console.log('🔧 Test simple iniciando...');

import express from 'express';
console.log('🔧 Express importado');

const app = express();
console.log('🔧 Express app creado');

const PORT = 3001;
console.log('🔧 PORT configurado');

app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`✅ Servidor test corriendo en puerto ${PORT}`);
});

console.log('🔧 Test simple completado');
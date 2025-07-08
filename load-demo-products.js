const fs = require('fs');
const axios = require('axios');

// Leer el CSV
const csv = fs.readFileSync('productos_demo.csv', 'utf8');
const lines = csv.split('\n').filter(line => line.trim());

console.log('🔧 Cargando productos de demostración...');

// Función para parsear una línea CSV
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Obtener token
async function getToken() {
    try {
        const response = await axios.post('http://127.0.0.1:3001/api/auth/login', {
            role: 'producer'
        });
        return response.data.token;
    } catch (error) {
        console.error('❌ Error obteniendo token:', error.response?.data || error.message);
        return null;
    }
}

// Crear producto
async function createProduct(token, productData) {
    try {
        const response = await axios.post('http://127.0.0.1:3001/api/food/products', productData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error creando producto:', productData.name, error.response?.data || error.message);
        return null;
    }
}

// Procesar productos
async function loadProducts() {
    const token = await getToken();
    if (!token) return;
    
    console.log('✅ Token obtenido, cargando productos...');
    
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
        const values = parseCSVLine(lines[i]);
        
        const productData = {
            name: values[0].replace(/"/g, ''),
            category: values[1].replace(/"/g, ''),
            description: values[2].replace(/"/g, ''),
            quantity: parseInt(values[3]),
            weight: values[4].replace(/"/g, ''),
            productionDate: values[5].replace(/"/g, ''),
            expirationDate: values[6].replace(/"/g, ''),
            batchNumber: values[7].replace(/"/g, ''),
            variety: values[8].replace(/"/g, ''),
            farmName: values[9].replace(/"/g, ''),
            farmLocation: values[10].replace(/"/g, ''),
            temperature: parseFloat(values[11]),
            humidity: parseFloat(values[12]),
            certifications: values[13].replace(/"/g, '').split(',').filter(c => c.trim()),
            allergens: values[14] ? values[14].replace(/"/g, '').split(',').filter(a => a.trim()) : []
        };
        
        console.log('🔄 Creando:', productData.name);
        const result = await createProduct(token, productData);
        if (result) {
            console.log('✅ Creado:', productData.name);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre productos
    }
    
    console.log('🎉 Carga de productos completada');
}

loadProducts().catch(console.error);
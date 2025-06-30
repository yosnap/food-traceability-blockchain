#!/usr/bin/env node

/**
 * Script para crear un usuario administrador
 * Ejecutar con: node create-admin-user.js
 */

const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'http://localhost:3001';

// Datos del usuario administrador
const adminUser = {
    address: 'admin-001',
    name: 'Administrador Principal',
    role: 'ADMIN',
    email: 'admin@foodtraceability.com',
    phone: '+1234567890',
    location: {
        country: 'Colombia',
        state: 'Bogotá',
        city: 'Bogotá',
        address: 'Calle Principal #123'
    },
    licenseNumber: 'ADMIN-LIC-001'
};

async function createAdminUser() {
    try {
        console.log('🚀 Creando usuario administrador...');
        console.log('📧 Email:', adminUser.email);
        console.log('🏷️  Rol:', adminUser.role);
        
        const response = await axios.post(`${API_BASE_URL}/api/users/register`, adminUser, {
            headers: {
                'Content-Type': 'application/json',
                // Si tienes autenticación, agregar aquí el token
                // 'Authorization': 'Bearer YOUR_TOKEN'
            }
        });

        if (response.data.success) {
            console.log('✅ Usuario administrador creado exitosamente!');
            console.log('📄 Detalles:');
            console.log('   - Address:', response.data.data.userAddress);
            console.log('   - Nombre:', response.data.data.name);
            console.log('   - Rol:', response.data.data.role);
            console.log('   - Email:', adminUser.email);
            console.log('   - Teléfono:', adminUser.phone);
            console.log('\n🔐 Credenciales para login:');
            console.log('   - Usuario:', adminUser.email);
            console.log('   - Address:', adminUser.address);
        } else {
            console.error('❌ Error creando usuario:', response.data.error);
        }

    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        
        if (error.response) {
            console.error('📄 Detalles del error:', error.response.data);
        } else {
            console.error('💡 Asegúrate de que la API esté ejecutándose en:', API_BASE_URL);
        }
    }
}

// Ejecutar el script
createAdminUser();
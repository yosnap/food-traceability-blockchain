// Simple test script to verify API connection from frontend context
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testApi() {
  try {
    console.log('Testing API connection...');
    const response = await api.get('/api/food/ping');
    console.log('✅ API Response:', response.data);
    
    // Test realLogin simulation
    if (response.data.success) {
      const token = `producer-token-${Date.now()}`;
      const user = {
        address: `0x742d35Cc8C6C330B4E3C2986c9b6C02b4C8B878A`,
        name: `Usuario producer`,
        role: 'producer',
        email: `producer@blockchain.com`,
        phone: '+34123456789',
        location: {
          address: 'Dirección Blockchain',
          city: 'Madrid',
          country: 'España',
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('✅ Mock login result:', { token, user });
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApi();
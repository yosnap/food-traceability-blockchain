# Crear Usuario Administrador - Métodos de API

## 🚀 Método 1: cURL

```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "address": "admin-001",
    "name": "Administrador Principal", 
    "role": "ADMIN",
    "email": "admin@foodtraceability.com",
    "phone": "+1234567890",
    "location": {
      "country": "Colombia",
      "state": "Bogotá", 
      "city": "Bogotá",
      "address": "Calle Principal #123"
    },
    "licenseNumber": "ADMIN-LIC-001"
  }'
```

## 📱 Método 2: Postman

### Request Details:
- **Method:** POST
- **URL:** `http://localhost:3001/api/users/register`
- **Headers:**
  ```
  Content-Type: application/json
  ```

### Request Body (JSON):
```json
{
  "address": "admin-001",
  "name": "Administrador Principal",
  "role": "ADMIN", 
  "email": "admin@foodtraceability.com",
  "phone": "+1234567890",
  "location": {
    "country": "Colombia",
    "state": "Bogotá",
    "city": "Bogotá", 
    "address": "Calle Principal #123"
  },
  "licenseNumber": "ADMIN-LIC-001"
}
```

## 🔧 Método 3: JavaScript (Frontend)

```javascript
const createAdminUser = async () => {
  try {
    const adminData = {
      address: "admin-001",
      name: "Administrador Principal",
      role: "ADMIN",
      email: "admin@foodtraceability.com", 
      phone: "+1234567890",
      location: {
        country: "Colombia",
        state: "Bogotá",
        city: "Bogotá",
        address: "Calle Principal #123"
      },
      licenseNumber: "ADMIN-LIC-001"
    };

    const response = await fetch('http://localhost:3001/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Usuario admin creado:', result.data);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
};

// Ejecutar
createAdminUser();
```

## 📋 Respuesta Esperada

```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "userAddress": "admin-001",
    "name": "Administrador Principal", 
    "role": "ADMIN",
    "transactionResult": "..."
  },
  "timestamp": "2024-12-30T..."
}
```

## 🔐 Credenciales para Login

Una vez creado el usuario admin, podrás usar estas credenciales:

- **Email:** admin@foodtraceability.com
- **Address:** admin-001
- **Rol:** ADMIN

## 🛠️ Troubleshooting

### Error: API no disponible
```bash
# Verificar que la API esté corriendo
curl http://localhost:3001/health
```

### Error: Datos inválidos
- Verificar que el email tenga formato válido
- Verificar que el rol sea exactamente "ADMIN" 
- Verificar que todos los campos requeridos estén presentes

### Error: Usuario ya existe
```bash
# Usar diferente address
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"address": "admin-002", ...}'
```
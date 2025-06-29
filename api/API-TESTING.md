# 🧪 Guía de Testing - Food Traceability API

## 📋 Información General

**Base URL**: `http://localhost:3001`  
**Formato**: JSON  
**Puerto**: 3001  

## 🚀 Iniciar la API

```bash
# Navegar al directorio de la API
cd api

# Instalar dependencias (si no están instaladas)
npm install

# Ejecutar en modo desarrollo
npm run dev

# O ejecutar versión compilada
npm run build && npm start
```

La API debería mostrar:
```
✅ Servidor corriendo en puerto 3001
🔗 API disponible en: http://localhost:3001/api
📊 Health check: http://localhost:3001/api/health
```

## 🔐 Sistema de Autenticación

La API usa **tokens mock** para desarrollo. Incluye uno de estos headers en tus requests:

```
Authorization: producer-token
Authorization: processor-token
Authorization: distributor-token
Authorization: retailer-token
Authorization: consumer-token
Authorization: admin-token
```

## 📡 Endpoints Públicos (sin autenticación)

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

**Respuesta esperada**:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-29T18:27:38.231Z",
  "uptime": 135.419737893,
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "api": {
      "status": "running",
      "port": "3001"
    },
    "fabric": {
      "status": "disconnected",
      "note": "Running in test mode without Fabric connection"
    }
  }
}
```

### 2. Información del Sistema
```bash
curl http://localhost:3001/api/info
```

### 3. Test Básico
```bash
curl http://localhost:3001/test
```

### 4. Registro de Usuario (público)
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Juan Pérez",
    "role": "PRODUCER",
    "email": "juan@ejemplo.com",
    "phone": "+34123456789",
    "location": {
      "address": "Calle Falsa 123",
      "city": "Madrid",
      "country": "España",
      "coordinates": {
        "lat": 40.4168,
        "lng": -3.7038
      }
    },
    "licenseNumber": "PROD-2024-001"
  }'
```

## 🔒 Endpoints Protegidos (requieren autenticación)

### 🍎 Productos (Food)

#### 1. Ping al Chaincode
```bash
curl http://localhost:3001/api/food/ping \
  -H "Authorization: producer-token"
```

#### 2. Crear Producto (solo PRODUCER/PROCESSOR)
```bash
curl -X POST http://localhost:3001/api/food/products \
  -H "Authorization: producer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PROD-001",
    "batchNumber": "BATCH-2024-001",
    "name": "Tomates Cherry Orgánicos",
    "category": "VEGETABLES",
    "description": "Tomates cherry cultivados orgánicamente",
    "quantity": 100,
    "productionDate": "2025-06-29",
    "expirationDate": "2025-07-05",
    "origin": {
      "farm": "Finca El Sol",
      "location": "Almería, España",
      "coordinates": {
        "lat": 36.8381,
        "lng": -2.4597
      }
    },
    "storageConditions": {
      "temperature": "4-8°C",
      "humidity": "85-90%",
      "requirements": ["Refrigeración", "Ventilación"]
    },
    "allergens": [],
    "weight": 5.0,
    "volume": 2.5,
    "brand": "Orgánicos El Sol"
  }'
```

#### 3. Obtener Producto por ID
```bash
curl http://localhost:3001/api/food/products/PROD-001 \
  -H "Authorization: consumer-token"
```

#### 4. Productos Próximos a Caducar
```bash
# Productos que caducan en 2 días (default)
curl http://localhost:3001/api/food/expiring \
  -H "Authorization: consumer-token"

# Productos que caducan en 7 días
curl "http://localhost:3001/api/food/expiring?daysAhead=7" \
  -H "Authorization: consumer-token"

# Filtrar por categoría
curl "http://localhost:3001/api/food/expiring?category=VEGETABLES" \
  -H "Authorization: consumer-token"
```

#### 5. Mis Productos
```bash
curl http://localhost:3001/api/food/products \
  -H "Authorization: producer-token"
```

#### 6. Productos por Categoría
```bash
curl http://localhost:3001/api/food/products/category/VEGETABLES \
  -H "Authorization: consumer-token"
```

#### 7. Transferir Producto
```bash
curl -X POST http://localhost:3001/api/food/products/PROD-001/transfer \
  -H "Authorization: producer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "newOwner": "0x2345678901234567890123456789012345678901",
    "transferType": "SALE",
    "location": {
      "address": "Mercado Central",
      "city": "Madrid",
      "country": "España"
    },
    "quantity": 50,
    "price": 125.50,
    "conditions": "Transporte refrigerado",
    "notes": "Entrega programada para mañana"
  }'
```

#### 8. Marcar como Consumido (solo CONSUMER)
```bash
curl -X POST http://localhost:3001/api/food/products/PROD-001/consume \
  -H "Authorization: consumer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "consumedDate": "2025-06-29T20:00:00Z",
    "rating": 5,
    "notes": "Excelente calidad y sabor"
  }'
```

#### 9. Estadísticas del Usuario
```bash
curl http://localhost:3001/api/food/stats \
  -H "Authorization: consumer-token"
```

### 👤 Usuarios (Users)

#### 1. Mi Perfil
```bash
curl http://localhost:3001/api/users/me \
  -H "Authorization: producer-token"
```

#### 2. Usuario por Dirección
```bash
curl http://localhost:3001/api/users/0x1234567890123456789012345678901234567890 \
  -H "Authorization: admin-token"
```

#### 3. Actualizar Mi Perfil
```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: producer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez González",
    "email": "juan.nuevo@ejemplo.com",
    "phone": "+34987654321"
  }'
```

#### 4. Configurar Notificaciones
```bash
curl -X PUT http://localhost:3001/api/users/me/notifications \
  -H "Authorization: consumer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "enableNotifications": true,
    "notificationDays": 3,
    "enableEmailNotifications": true,
    "enablePushNotifications": true,
    "quietHours": {
      "start": "22:00",
      "end": "08:00"
    },
    "categorySettings": {
      "VEGETABLES": { "enabled": true, "daysAhead": 2 },
      "FRUITS": { "enabled": true, "daysAhead": 1 },
      "MEAT": { "enabled": true, "daysAhead": 1 }
    }
  }'
```

#### 5. Obtener Configuración de Notificaciones
```bash
curl http://localhost:3001/api/users/me/notifications \
  -H "Authorization: consumer-token"
```

## 📋 Colección de Postman

### Configurar Postman

1. **Crear nueva colección**: "Food Traceability API"

2. **Configurar variables de entorno**:
   - `baseUrl`: `http://localhost:3001`
   - `producerToken`: `producer-token`
   - `consumerToken`: `consumer-token`
   - `adminToken`: `admin-token`

3. **Importar requests** usando los ejemplos de arriba

### Headers Comunes para Postman

```
Content-Type: application/json
Authorization: {{producerToken}}
```

### Scripts de Pre-request para Postman

Para generar IDs únicos:
```javascript
// Para generar ID de producto único
pm.globals.set("productId", "PROD-" + Date.now());

// Para generar batch number único
pm.globals.set("batchNumber", "BATCH-" + new Date().getFullYear() + "-" + Date.now());
```

## 🧪 Scripts de Testing Automatizado

### Script completo de pruebas
```bash
#!/bin/bash

echo "🧪 Testing Food Traceability API..."

BASE_URL="http://localhost:3001"
PRODUCER_TOKEN="producer-token"
CONSUMER_TOKEN="consumer-token"

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/api/health" | jq '.status'

# Test 2: System Info
echo "2. Testing System Info..."
curl -s "$BASE_URL/api/info" | jq '.name'

# Test 3: Create Product
echo "3. Testing Create Product..."
PRODUCT_ID="PROD-$(date +%s)"
curl -s -X POST "$BASE_URL/api/food/products" \
  -H "Authorization: $PRODUCER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$PRODUCT_ID\",
    \"batchNumber\": \"BATCH-2024-001\",
    \"name\": \"Test Product\",
    \"category\": \"VEGETABLES\",
    \"description\": \"Test description\",
    \"quantity\": 10,
    \"productionDate\": \"2025-06-29\",
    \"expirationDate\": \"2025-07-05\",
    \"origin\": {\"farm\": \"Test Farm\"},
    \"storageConditions\": {\"temperature\": \"4°C\"},
    \"allergens\": []
  }" | jq '.success'

# Test 4: Get Product
echo "4. Testing Get Product..."
curl -s "$BASE_URL/api/food/products/$PRODUCT_ID" \
  -H "Authorization: $CONSUMER_TOKEN" | jq '.success'

# Test 5: Expiring Products
echo "5. Testing Expiring Products..."
curl -s "$BASE_URL/api/food/expiring" \
  -H "Authorization: $CONSUMER_TOKEN" | jq '.success'

echo "✅ Tests completed!"
```

## 🔍 Códigos de Respuesta

- **200**: Success
- **201**: Created
- **400**: Bad Request (datos inválidos)
- **401**: Unauthorized (falta token)
- **403**: Forbidden (permisos insuficientes)
- **404**: Not Found
- **500**: Internal Server Error

## 🚨 Troubleshooting

### Error: ECONNREFUSED
- Verifica que la API esté ejecutándose: `npm run dev`
- Confirma el puerto: `http://localhost:3001`

### Error: 401 Unauthorized
- Agrega header de autorización: `Authorization: producer-token`

### Error: 500 Internal Server Error
- Revisa logs de la API en la consola
- Verifica que Hyperledger Fabric esté ejecutándose: `docker ps`

### Fabric Connection Issues
- La API funciona sin chaincode en modo "mock"
- Los endpoints devuelven errores controlados si Fabric no está disponible

## 📚 Recursos Adicionales

- **Logs de la API**: Revisa la consola donde ejecutaste `npm run dev`
- **Docker Status**: `docker ps` para ver containers de Fabric
- **Network Status**: `curl http://localhost:3001/api/health/detailed`

---

¡Listo para testear! 🚀 Comienza con los endpoints públicos y luego prueba los protegidos con diferentes tokens.
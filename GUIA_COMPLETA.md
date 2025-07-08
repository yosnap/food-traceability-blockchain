# 📋 GUÍA COMPLETA - SISTEMA DE TRAZABILIDAD DE ALIMENTOS

## 🚀 INICIO RÁPIDO

### 1. Levantar el Sistema
```bash
# Terminal 1: Red Blockchain
cd fabric-samples/test-network
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn food-traceability -ccp ../../chaincode -ccl typescript

# Terminal 2: Backend API
cd api
npm start
# ✅ http://localhost:3001/api

# Terminal 3: Frontend
cd web  
npm run dev
# ✅ http://localhost:3000
```

### 2. Crear Usuario Completo
```bash
# Paso 1: Generar token
curl -X POST http://localhost:3001/api/test/auth/generate-token \
  -H "Content-Type: application/json" \
  -d '{"userId": "producer1", "role": "producer", "name": "Juan Productor"}'

# Copiar el token de la respuesta
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Paso 2: Registrar en chaincode
curl -X POST http://localhost:3001/api/hlf/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "producer1-address",
    "name": "Juan Productor", 
    "role": "producer",
    "email": "juan@granja.com",
    "phone": "+34123456789",
    "locationData": {
      "address": "Calle Principal 123",
      "city": "Valencia",
      "state": "Valencia", 
      "country": "España",
      "postalCode": "46001"
    },
    "licenseNumber": "PROD001"
  }'

# Paso 3: Verificar usuario
curl -X GET http://localhost:3001/api/hlf/users/producer1-address \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Crear Producto
```bash
curl -X POST http://localhost:3001/api/food/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manzanas Red Delicious",
    "category": "FRUITS",
    "description": "Manzanas frescas de temporada",
    "quantity": 100,
    "productionDate": "2025-07-04T10:00:00.000Z",
    "expirationDate": "2025-08-04T10:00:00.000Z", 
    "weight": 50
  }'
```

### 4. Configurar Frontend
```javascript
// En el navegador (http://localhost:3000)
// Abrir consola (F12) y ejecutar:
localStorage.setItem('authToken', 'TU_TOKEN_AQUI');
window.location.reload();
```

## 📚 ENDPOINTS PRINCIPALES

### Autenticación
- `POST /api/test/auth/generate-token` - Generar token de prueba
- `POST /api/auth/login` - Login con X.509

### Usuarios
- `POST /api/hlf/users` - Registrar usuario en chaincode
- `GET /api/hlf/users/{address}` - Obtener usuario
- `GET /api/hlf/users/role/{role}` - Usuarios por rol

### Productos  
- `POST /api/food/products` - Crear producto
- `GET /api/food/products` - Mis productos
- `GET /api/food/products/{id}` - Producto específico
- `POST /api/food/products/{id}/transfer` - Transferir

### Utilidades
- `GET /api/test/ping` - Ping al chaincode
- `GET /api/health` - Estado del sistema

## 🔐 ROLES Y FLUJO

```
PRODUCER → FACTORY → RETAILER → CONSUMER
   🚜        🏭        🏪        👤
```

## 🛠️ SOLUCIÓN DE PROBLEMAS

### Chaincode no responde
```bash
docker ps | grep food-traceability
docker logs CONTAINER_ID --tail 20
```

### Reiniciar todo
```bash
./network.sh down
docker volume prune -f
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn food-traceability -ccp ../../chaincode -ccl typescript
```

### Usuario no existe
1. Verificar que esté registrado en chaincode
2. Usar el mismo address en token y registro
3. Verificar formato de datos

## 📋 FORMATOS REQUERIDOS

### Fechas
```
"2025-07-04T10:00:00.000Z"  ✅
"2025-07-04"                ❌
```

### Categorías
```
"FRUITS", "VEGETABLES", "DAIRY", "MEAT", "GRAINS", "BEVERAGES"
```

### Ubicación
```json
{
  "address": "Calle Principal 123",
  "city": "Valencia", 
  "state": "Valencia",
  "country": "España",
  "postalCode": "46001"
}
```

## 🎯 CASOS DE USO

1. **Productor crea manzanas** → Registra lote de producción
2. **Fábrica procesa** → Recibe y transforma en zumo
3. **Tienda vende** → Distribuye al consumidor final
4. **Consumidor compra** → Rastrea origen completo

## 🔍 VERIFICACIÓN PASO A PASO

1. `curl http://localhost:3001/api/health` ✅
2. `curl http://localhost:3001/api/test/ping` ✅  
3. Generar token ✅
4. Registrar usuario ✅
5. Crear producto ✅
6. Frontend configurado ✅
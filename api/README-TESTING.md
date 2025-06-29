# 🧪 Food Traceability API - Guía de Testing

## 🚀 Inicio Rápido

### 1. Iniciar la API
```bash
cd api
npm install
npm run dev
```

### 2. Test Rápido (5 segundos)
```bash
./quick-test.sh
```

### 3. Test Completo (2-3 minutos)
```bash
./test-api-complete.sh
```

## 📋 Opciones de Testing

### 🖥️ Terminal (Recomendado para desarrollo)

#### Test Básico
```bash
# Health check simple
curl http://localhost:3001/api/health

# Con formato JSON
curl http://localhost:3001/api/health | jq
```

#### Tests por Categoría
```bash
# Solo endpoints públicos
./test-api-complete.sh public

# Solo usuarios
./test-api-complete.sh users

# Solo productos
./test-api-complete.sh food

# Solo autorización
./test-api-complete.sh auth
```

### 📮 Postman (Recomendado para testing manual)

1. **Importar colección**:
   - Abrir Postman
   - Import → File → `Food-Traceability-API.postman_collection.json`

2. **Configurar variables**:
   - `baseUrl`: `http://localhost:3001`
   - `producerToken`: `producer-token`
   - `consumerToken`: `consumer-token`

3. **Ejecutar tests**:
   - Comenzar con la carpeta "📊 Health & Info"
   - Continuar con "👤 Users"
   - Terminar con "🍎 Food Products"

### 🌐 Bruno/Insomnia

También puedes usar los ejemplos curl de `API-TESTING.md` en cualquier cliente REST.

## 🔐 Tokens de Autenticación

```bash
# Tokens disponibles para testing
producer-token      # PRODUCER role
processor-token     # PROCESSOR role  
distributor-token   # DISTRIBUTOR role
retailer-token      # RETAILER role
consumer-token      # CONSUMER role
admin-token         # ADMIN role
```

## 📊 Endpoints Principales

### Públicos (sin autenticación)
- `GET /api/health` - Health check
- `GET /api/info` - Información del sistema
- `GET /test` - Test básico
- `POST /api/users/register` - Registro de usuario

### Protegidos (requieren Authorization header)
- `GET /api/users/me` - Mi perfil
- `GET /api/food/ping` - Ping al chaincode
- `POST /api/food/products` - Crear producto
- `GET /api/food/expiring` - Productos próximos a caducar

## 🧪 Ejemplos de Testing

### Test Manual con curl

```bash
# 1. Verificar que la API funciona
curl http://localhost:3001/api/health

# 2. Crear un producto
curl -X POST http://localhost:3001/api/food/products \
  -H "Authorization: producer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PROD-TEST-001",
    "batchNumber": "BATCH-2024-001",
    "name": "Producto Test",
    "category": "VEGETABLES",
    "description": "Producto para testing",
    "quantity": 10,
    "productionDate": "2025-06-29",
    "expirationDate": "2025-07-05",
    "origin": {"farm": "Test Farm"},
    "storageConditions": {"temperature": "4°C"},
    "allergens": []
  }'

# 3. Obtener el producto
curl http://localhost:3001/api/food/products/PROD-TEST-001 \
  -H "Authorization: consumer-token"

# 4. Ver productos próximos a caducar
curl http://localhost:3001/api/food/expiring \
  -H "Authorization: consumer-token"
```

### Test de Autorización

```bash
# Esto debe fallar (401)
curl http://localhost:3001/api/food/products

# Esto debe funcionar (200)
curl http://localhost:3001/api/food/products \
  -H "Authorization: producer-token"

# Esto debe fallar (403) - consumer no puede crear productos
curl -X POST http://localhost:3001/api/food/products \
  -H "Authorization: consumer-token" \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST","name":"Test"}'
```

## 📈 Códigos de Respuesta Esperados

- **200**: Éxito
- **201**: Creado exitosamente
- **400**: Datos inválidos
- **401**: No autorizado (falta token)
- **403**: Prohibido (permisos insuficientes)
- **404**: No encontrado
- **500**: Error del servidor

## 🔧 Troubleshooting

### Error: Connection refused
```bash
# Verificar que la API esté ejecutándose
ps aux | grep node
netstat -an | grep 3001

# Reiniciar la API
npm run dev
```

### Error: 401 Unauthorized
```bash
# Verificar que estás enviando el header correcto
curl -H "Authorization: producer-token" http://localhost:3001/api/users/me
```

### Error: 500 Internal Server Error
```bash
# Revisar logs de la API en la consola
# Verificar que Hyperledger Fabric esté ejecutándose
docker ps | grep hyperledger
```

## 📝 Logging y Debug

### Ver logs detallados de la API
```bash
# La API muestra logs en tiempo real en la consola donde ejecutaste npm run dev
📥 2025-06-29T18:27:38.222Z GET /api/health - IP: 127.0.0.1
✅ 200 GET /api/health - 15ms
```

### Test con más detalle
```bash
# Ejecutar curl con verbose para ver headers
curl -v http://localhost:3001/api/health

# Ver solo el status code
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
```

## 🎯 Flujo de Testing Recomendado

1. **🔍 Verificar conectividad**: `./quick-test.sh`
2. **🏥 Health checks**: Endpoints públicos
3. **👤 Usuarios**: Registro y perfil
4. **🍎 Productos**: CRUD completo
5. **🔄 Transferencias**: Flujo completo de trazabilidad
6. **🔐 Autorización**: Verificar permisos
7. **⚡ Casos extremos**: Datos inválidos, rutas inexistentes

## 📚 Recursos Adicionales

- `API-TESTING.md` - Documentación completa
- `Food-Traceability-API.postman_collection.json` - Colección de Postman
- `test-api-complete.sh` - Suite completa de tests
- `quick-test.sh` - Test rápido

---

¡Happy Testing! 🚀
# Sistema de Registro de Usuarios con Certificados .pem

## Resumen

Se ha implementado un sistema completo de verificación de usuarios donde el administrador puede registrar usuarios usando wallets de Metamask y certificados .pem. Este sistema integra autenticación Web3 con certificados X.509 de Hyperledger Fabric.

## Funcionalidades Implementadas

### 1. **Servicio de Gestión de Certificados de Usuario**
- **Archivo**: `api/src/services/UserCertificateService.ts`
- **Funcionalidades**:
  - Creación automática de certificados .pem usando fabric-ca-client
  - Validación de certificados personalizados
  - Gestión de organizaciones por rol (Org1MSP para producers, Org2MSP para factory/retailer/consumer)
  - Revocación de certificados
  - Listado de certificados activos

### 2. **Controlador de Administración de Usuarios**
- **Archivo**: `api/src/controllers/AdminUserController.ts`
- **Endpoints**:
  - `POST /api/admin/users` - Registrar nuevo usuario
  - `GET /api/admin/users` - Listar usuarios registrados
  - `GET /api/admin/users/:walletAddress` - Obtener usuario específico
  - `DELETE /api/admin/users/:walletAddress` - Revocar usuario y certificado

### 3. **Middleware de Autenticación con Certificados**
- **Archivo**: `api/src/middleware/certificateAuthMiddleware.ts`
- **Características**:
  - Verificación dual: Metamask + certificados .pem
  - Validación de firmas digitales
  - Control de acceso basado en roles
  - Soporte para operaciones que requieren firma específica

### 4. **Rutas Administrativas Actualizadas**
- **Archivo**: `api/src/routes/adminRoutes.ts`
- **Nuevas rutas**:
  - Gestión completa de usuarios
  - Verificación de certificados
  - Listado de certificados del sistema

### 5. **Componente Frontend de Registro**
- **Archivo**: `web/src/components/AdminUserRegistration.tsx`
- **Características**:
  - Interfaz multi-paso para registro
  - Integración con Metamask
  - Carga de certificados .pem personalizados
  - Generación automática de certificados
  - Validación en tiempo real

### 6. **Scripts de Prueba**
- **Archivo**: `scripts/test-admin-user-registration.js`
- **Pruebas incluidas**:
  - Autenticación de administrador
  - Registro con certificado automático
  - Registro con certificado personalizado
  - Validaciones del sistema
  - Listado de usuarios
  - Revocación de usuarios

## Flujo de Trabajo

### Registro de Usuario por Admin

1. **Autenticación del Admin**
   - El admin se autentica con su wallet
   - Obtiene token JWT con permisos administrativos

2. **Datos del Usuario**
   - Dirección de wallet Ethereum del usuario
   - Rol del usuario (producer, factory, retailer, consumer)
   - Opción de certificado (automático o personalizado)

3. **Generación de Certificado**
   - **Automático**: Sistema genera certificado usando fabric-ca-client
   - **Personalizado**: Admin sube archivo .pem validado

4. **Firma del Admin**
   - Admin firma mensaje con formato: `registerUser:${walletAddress}:${role}`
   - Firma se valida usando ethers.js

5. **Registro en Blockchain**
   - Usuario se registra en UserContractReference
   - Certificado se almacena en filesystem de Fabric
   - Datos se persisten en ledger

### Verificación de Operaciones

1. **Autenticación Dual**
   - Verificación de firma Metamask con ethers.js
   - Validación de certificado .pem (opcional)

2. **Control de Acceso**
   - Middleware verifica roles permitidos
   - Validación de permisos por operación

3. **Firma de Operaciones**
   - Operaciones críticas requieren firma específica
   - Mensaje incluye tipo de operación y parámetros

## Arquitectura del Sistema

### Componentes Backend

```
api/src/
├── services/
│   ├── UserCertificateService.ts    # Gestión de certificados
│   └── HLFService.ts               # Servicio Hyperledger Fabric
├── controllers/
│   └── AdminUserController.ts      # Controlador de administración
├── middleware/
│   └── certificateAuthMiddleware.ts # Autenticación con certificados
└── routes/
    └── adminRoutes.ts              # Rutas administrativas
```

### Componentes Frontend

```
web/src/
├── components/
│   └── AdminUserRegistration.tsx   # Formulario de registro
├── services/
│   └── walletService.ts           # Servicio de wallet
└── hooks/
    └── useAuth.ts                 # Hook de autenticación
```

### Integración con Blockchain

```
chaincode/src/contracts/
├── UserContractReference.ts       # Contrato de usuarios
└── TokenizarContract.ts           # Contrato de tokenización
```

## Configuración

### Variables de Entorno

```bash
# JWT Secret
JWT_SECRET=your_jwt_secret

# Fabric Network
FABRIC_SAMPLES_PATH=../fabric-samples/test-network
FABRIC_CA_CLIENT_HOME=./ca-client
```

### Dependencias

```json
{
  "ethers": "^6.15.0",
  "fabric-ca-client": "^2.2.0",
  "fabric-network": "^2.2.0",
  "jsonwebtoken": "^9.0.0"
}
```

## Uso

### 1. Iniciar el Sistema

```bash
# Backend
cd api
npm install
npm run dev

# Frontend
cd web
npm install
npm run dev
```

### 2. Registrar Usuario como Admin

```bash
# Ejecutar pruebas
node scripts/test-admin-user-registration.js
```

### 3. Usar la Interfaz Web

1. Ir a `http://localhost:3000`
2. Autenticarse como admin
3. Usar el componente AdminUserRegistration
4. Completar el flujo de registro

## Endpoints de API

### Administración de Usuarios

```http
POST /api/admin/users
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "walletAddress": "0x...",
  "role": "producer",
  "adminSignature": "0x...",
  "certificatePem": "-----BEGIN CERTIFICATE-----..." // Opcional
}
```

### Listar Usuarios

```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

### Obtener Usuario

```http
GET /api/admin/users/0x...
Authorization: Bearer <admin_token>
```

### Revocar Usuario

```http
DELETE /api/admin/users/0x...
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "adminSignature": "0x..."
}
```

## Seguridad

### Validaciones Implementadas

1. **Formato de Dirección**: Validación de formato Ethereum
2. **Roles Válidos**: Solo roles permitidos del sistema
3. **Firmas Digitales**: Verificación criptográfica de firmas
4. **Certificados .pem**: Validación de formato y contenido
5. **Permisos de Admin**: Solo admins pueden registrar usuarios

### Mejores Prácticas

1. **Principio de Menor Privilegio**: Cada rol tiene permisos específicos
2. **Verificación Dual**: Metamask + certificados cuando sea posible
3. **Firmas Específicas**: Cada operación requiere firma específica
4. **Validación de Entrada**: Todas las entradas se validan
5. **Logs de Auditoría**: Todas las operaciones se registran

## Pruebas

### Ejecutar Pruebas

```bash
# Pruebas de registro
node scripts/test-admin-user-registration.js

# Pruebas de autenticación
node scripts/test-producer-auth.js

# Pruebas de admin
node scripts/test-admin-login.js
```

### Casos de Prueba

1. **Registro Exitoso**: Usuario válido con todos los datos
2. **Validaciones**: Direcciones inválidas, roles incorrectos
3. **Autenticación**: Verificación de firmas y certificados
4. **Permisos**: Control de acceso por roles
5. **Revocación**: Eliminación de usuarios y certificados

## Monitoreo

### Logs del Sistema

```bash
# Seguir logs del backend
tail -f api/logs/app.log

# Seguir logs de Hyperledger Fabric
docker logs -f peer0.org1.example.com
```

### Métricas

- Total de usuarios registrados
- Certificados activos/revocados
- Operaciones por rol
- Errores de autenticación

## Mantenimiento

### Backup de Certificados

```bash
# Backup de certificados
tar -czf certificates-backup.tar.gz fabric-samples/test-network/organizations/
```

### Limpieza de Certificados Expirados

```bash
# Script de limpieza (implementar según necesidades)
node scripts/cleanup-expired-certificates.js
```

## Resolución de Problemas

### Errores Comunes

1. **"Certificado inválido"**: Verificar formato .pem
2. **"Firma inválida"**: Verificar que la wallet esté conectada
3. **"Permisos insuficientes"**: Verificar rol de administrador
4. **"Usuario ya existe"**: Verificar dirección en blockchain

### Logs de Debug

```bash
# Habilitar logs detallados
DEBUG=* npm run dev
```

## Próximos Pasos

1. **Interfaz de Gestión**: Panel completo para administrador
2. **Renovación de Certificados**: Sistema automático de renovación
3. **Auditoría Avanzada**: Logs detallados de todas las operaciones
4. **Notificaciones**: Alertas por email/webhook
5. **Backup Automático**: Respaldo programado de certificados

## Contribución

Para contribuir al sistema:

1. Fork del repositorio
2. Crear branch para nueva funcionalidad
3. Implementar cambios con pruebas
4. Enviar pull request con descripción detallada

## Soporte

Para soporte técnico:

- Crear issue en GitHub
- Revisar logs del sistema
- Verificar configuración de Fabric
- Consultar documentación de Hyperledger Fabric
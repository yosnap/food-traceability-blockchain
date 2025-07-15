# Administrador Principal del Sistema

## Información del Administrador

**Wallet Address**: `0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d`  
**Rol**: `admin`  
**MSP**: `Org1MSP`  
**Organización**: `org1`  
**Usuario Fabric**: `AdminPrincipal`  

## Configuración Inicial

### 1. Inicialización del Sistema

Antes de usar el sistema, el administrador debe ser inicializado:

```bash
# Ejecutar script de inicialización
node scripts/initialize-admin.js
```

Este script:
- ✅ Verifica la configuración del administrador
- ✅ Valida la red Hyperledger Fabric
- ✅ Crea la estructura de directorios necesaria
- ✅ Genera certificado X.509 para el administrador
- ✅ Valida el certificado generado
- ✅ Inicializa el contrato en blockchain
- ✅ Prueba la autenticación

### 2. Verificación del Estado

```bash
# Verificar estado del administrador
curl -X GET http://localhost:3001/api/admin/status \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

## Funcionalidades del Administrador

### 1. **Registro de Usuarios**

El administrador puede registrar nuevos usuarios con dos métodos:

#### A. Certificado Automático
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d" \
  -d '{
    "walletAddress": "0x...",
    "role": "producer",
    "adminSignature": "0x...",
    "adminAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
  }'
```

#### B. Certificado Personalizado
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d" \
  -d '{
    "walletAddress": "0x...",
    "role": "producer",
    "adminSignature": "0x...",
    "certificatePem": "-----BEGIN CERTIFICATE-----...",
    "adminAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
  }'
```

### 2. **Gestión de Usuarios**

#### Listar Usuarios
```bash
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

#### Obtener Usuario Específico
```bash
curl -X GET http://localhost:3001/api/admin/users/0x... \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

#### Revocar Usuario
```bash
curl -X DELETE http://localhost:3001/api/admin/users/0x... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d" \
  -d '{
    "adminSignature": "0x...",
    "adminAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
  }'
```

### 3. **Gestión de Certificados**

#### Listar Certificados
```bash
curl -X GET http://localhost:3001/api/admin/certificates \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

#### Verificar Certificado
```bash
curl -X POST http://localhost:3001/api/admin/certificates/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d" \
  -d '{
    "walletAddress": "0x...",
    "certificatePem": "-----BEGIN CERTIFICATE-----..."
  }'
```

## Proceso de Firma de Operaciones

### 1. **Formato de Mensajes**

Cada operación requiere un mensaje específico:

- **Registro**: `registerUser:{walletAddress}:{role}`
- **Revocación**: `revokeUser:{walletAddress}`
- **Actualización**: `updateUser:{walletAddress}:{newRole}`

### 2. **Generación de Firma**

```javascript
const { ethers } = require('ethers');

// Crear wallet del administrador
const adminWallet = new ethers.Wallet('PRIVATE_KEY');

// Generar firma para registro
const message = `registerUser:${userAddress}:${role}`;
const signature = await adminWallet.signMessage(message);
```

### 3. **Validación de Firma**

El sistema valida:
- ✅ Formato de la firma (0x + 132 caracteres)
- ✅ Recuperación de dirección del firmante
- ✅ Coincidencia con wallet del administrador
- ✅ Certificado X.509 válido

## Sistema de Seguridad

### 1. **Validaciones Implementadas**

- **Wallet Address**: Solo `0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d`
- **Certificado X.509**: Validación obligatoria
- **Firmas Digitales**: Verificación criptográfica
- **Operaciones Específicas**: Cada operación require firma única

### 2. **Middleware de Validación**

```javascript
// Middleware aplicado a todas las rutas administrativas
- adminWalletMiddleware: Valida wallet del administrador
- adminValidationMiddleware: Valida certificado X.509
- adminOperationValidationMiddleware: Valida firma de operación
```

### 3. **Control de Acceso**

```javascript
// Solo el administrador principal puede:
- Registrar usuarios
- Revocar usuarios
- Gestionar certificados
- Ver todos los usuarios
- Configurar el sistema
```

## Interfaz de Usuario

### 1. **Componente React**

Ubicación: `web/src/components/AdminUserRegistration.tsx`

Características:
- 📱 Integración con MetaMask
- 🔐 Generación automática de firmas
- 📄 Carga de certificados personalizados
- ✅ Validación en tiempo real
- 🎯 Interfaz multi-paso

### 2. **Uso del Componente**

```jsx
import AdminUserRegistration from './components/AdminUserRegistration';

// En tu componente
<AdminUserRegistration 
  onClose={() => setShowModal(false)}
  onUserCreated={(user) => {
    console.log('Usuario creado:', user);
    refreshUserList();
  }}
/>
```

## Archivos de Configuración

### 1. **admin-config.json**

Configuración principal del administrador:
```json
{
  "adminPrincipal": {
    "walletAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d",
    "role": "admin",
    "mspId": "Org1MSP",
    "organizationId": "org1"
  }
}
```

### 2. **Ubicación de Certificados**

```
fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/AdminPrincipal@org1.example.com/
├── msp/
│   ├── signcerts/cert.pem
│   ├── keystore/private_key_sk
│   ├── cacerts/ca-cert.pem
│   └── tlscacerts/tlsca-cert.pem
└── tls/
    └── ...
```

## Pruebas del Sistema

### 1. **Ejecutar Pruebas**

```bash
# Pruebas completas del administrador
node scripts/test-admin-user-registration.js

# Inicialización del administrador
node scripts/initialize-admin.js
```

### 2. **Casos de Prueba**

- ✅ Autenticación del administrador
- ✅ Registro con certificado automático
- ✅ Registro con certificado personalizado
- ✅ Validaciones de seguridad
- ✅ Listado de usuarios
- ✅ Revocación de usuarios

## Mantenimiento

### 1. **Renovación de Certificados**

```bash
# Renovar certificado manualmente
curl -X POST http://localhost:3001/api/admin/certificates/renew \
  -H "Authorization: Bearer <token>" \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

### 2. **Backup de Certificados**

```bash
# Backup de certificados del administrador
tar -czf admin-certificates-backup.tar.gz \
  fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/AdminPrincipal@org1.example.com/
```

### 3. **Logs del Sistema**

```bash
# Seguir logs del administrador
tail -f api/logs/admin.log

# Logs de validación
tail -f api/logs/validation.log
```

## Solución de Problemas

### 1. **Certificado Inválido**

```bash
# Regenerar certificado
node scripts/initialize-admin.js

# Verificar certificado
openssl x509 -in fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/AdminPrincipal@org1.example.com/msp/signcerts/cert.pem -text -noout
```

### 2. **Firma Inválida**

```javascript
// Verificar que la wallet esté correcta
const wallet = new ethers.Wallet('PRIVATE_KEY');
console.log('Wallet address:', wallet.address);
// Debe ser: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d
```

### 3. **Permisos Insuficientes**

```bash
# Verificar estado del administrador
curl -X GET http://localhost:3001/api/admin/status \
  -H "x-admin-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d"
```

## Contacto y Soporte

Para soporte técnico relacionado con el administrador:

1. **Verificar configuración**: Revisar `admin-config.json`
2. **Ejecutar inicialización**: `node scripts/initialize-admin.js`
3. **Revisar logs**: `tail -f api/logs/admin.log`
4. **Crear issue**: En GitHub con logs detallados

---

**⚠️ IMPORTANTE**: La clave privada del administrador debe mantenerse segura y no debe ser compartida. En producción, usar un sistema de gestión de claves seguro.
# Flujo de Autenticación Unificado

## Sistema de Identidad y Firma para Todos los Roles

### Arquitectura

1. **Metamask**: Proporciona la identidad del usuario (wallet address)
2. **Certificado .pem**: Firma todas las operaciones del usuario

### Flujo Completo

## 1. Login del Usuario (Cualquier Rol)

### Paso 1: Conectar Metamask
```javascript
// Frontend
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
const walletAddress = accounts[0];
const message = `Login to Food Traceability System\nTimestamp: ${Date.now()}`;
const signature = await ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress]
});
```

### Paso 2: Autenticarse en el Backend
```javascript
// POST /api/auth/login
{
    "walletAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d",  // Admin
    "signature": "0x...",
    "message": "Login to Food Traceability System...",
    "role": "admin"  // o "producer", "factory", "retailer", "consumer"
}

// Respuesta
{
    "success": true,
    "token": "eyJhbGc...",
    "user": {
        "walletAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d",
        "role": "admin",
        "organizationId": "org1",
        "mspId": "Org1MSP",
        "hasCertificate": true  // Indica si tiene certificado para firmar
    }
}
```

## 2. Ejecutar Operación Firmada

### Paso 1: Preparar y Firmar Operación (Backend)
```javascript
// POST /api/operations/sign
// Headers: Authorization: Bearer <token>
{
    "operation": "registerUser",
    "parameters": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "producer"]
}

// Respuesta
{
    "success": true,
    "signedOperation": {
        "operation": "registerUser",
        "parameters": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "producer"],
        "walletAddress": "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d",
        "certificateSignature": "MEUCIQDg7...",  // Firma con certificado .pem
        "algorithm": "SHA256withRSA",
        "timestamp": "2024-07-09T12:00:00Z",
        "nonce": "a1b2c3d4..."
    }
}
```

### Paso 2: Ejecutar Operación Firmada
```javascript
// POST /api/admin/users
// Headers: 
//   Authorization: Bearer <token>
//   x-wallet-address: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d
//   x-signed-operation: {"operation":"registerUser",...}
{
    "walletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "role": "producer"
}
```

## 3. Operaciones por Rol

### Admin
```javascript
// Registrar Usuario
const signedOp = await signOperation("registerUser", [userWallet, userRole]);

// Revocar Usuario  
const signedOp = await signOperation("revokeUser", [userWallet]);

// Gestionar Certificados
const signedOp = await signOperation("manageCertificate", [userWallet, action]);
```

### Producer
```javascript
// Crear Producto
const signedOp = await signOperation("createProduct", [productId, productData]);

// Transferir a Factory
const signedOp = await signOperation("transferProduct", [productId, factoryWallet]);
```

### Factory
```javascript
// Procesar Producto
const signedOp = await signOperation("processProduct", [productId, processData]);

// Transferir a Retailer
const signedOp = await signOperation("transferProduct", [productId, retailerWallet]);
```

### Retailer
```javascript
// Recibir Producto
const signedOp = await signOperation("receiveProduct", [productId]);

// Vender a Consumer
const signedOp = await signOperation("sellProduct", [productId, consumerWallet]);
```

### Consumer
```javascript
// Comprar Producto
const signedOp = await signOperation("purchaseProduct", [productId]);

// Ver Trazabilidad
const signedOp = await signOperation("viewTraceability", [productId]);
```

## 4. Validación en el Backend

### Middleware de Validación
```javascript
// Toda operación pasa por:
1. identityMiddleware - Valida token JWT y wallet
2. roleMiddleware - Verifica permisos del rol
3. signedOperationMiddleware - Verifica firma con certificado

// Ejemplo en rutas
router.post('/products',
    identityMiddleware,                    // Identidad con Metamask
    roleMiddleware(['producer']),          // Solo productores
    signedOperationMiddleware('createProduct'),  // Firma con certificado
    createProductController
);
```

## 5. Estructura de Certificados

### Por Organización
```
org1.example.com (Admin, Producer)
├── users/
│   ├── AdminPrincipal@org1.example.com/
│   │   └── msp/
│   │       ├── signcerts/cert.pem
│   │       └── keystore/private_key_sk
│   └── User_70997970@org1.example.com/  (Producer)
│       └── msp/
│           ├── signcerts/cert.pem
│           └── keystore/private_key_sk

org2.example.com (Factory, Retailer, Consumer)
├── users/
│   ├── User_3C44CdDd@org2.example.com/  (Factory)
│   ├── User_90F79bf6@org2.example.com/  (Retailer)
│   └── User_15d34AAf@org2.example.com/  (Consumer)
```

## 6. Flujo de Registro de Usuario por Admin

### Paso 1: Admin se autentica
```javascript
// Admin conecta Metamask
const adminWallet = "0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d";
const token = await login(adminWallet, signature, "admin");
```

### Paso 2: Admin firma operación de registro
```javascript
// Firma con certificado del admin
const signedOp = await signOperation("registerUser", [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // Nueva wallet
    "producer"                                       // Rol
]);
```

### Paso 3: Ejecutar registro
```javascript
// POST /api/admin/users con operación firmada
// El sistema:
1. Verifica identidad del admin (Metamask)
2. Verifica firma con certificado del admin
3. Crea usuario en blockchain
4. Genera certificado para el nuevo usuario
```

## 7. Seguridad

### Validaciones
1. **Identidad**: Token JWT válido + wallet correcta
2. **Certificado**: Usuario tiene certificado asignado
3. **Firma**: Operación firmada con certificado válido
4. **Timestamp**: Operación no mayor a 5 minutos
5. **Nonce**: Previene replay attacks
6. **Rol**: Usuario tiene permisos para la operación

### Ejemplo de Verificación
```javascript
// Backend verifica:
1. JWT contiene wallet: 0xc573fCb764C3f21bDB6bb5563982E4AF47529f8d
2. Certificado pertenece a: AdminPrincipal@org1.example.com
3. Firma es válida con el certificado
4. Operación es "registerUser"
5. Admin tiene permiso para registrar usuarios
6. Timestamp es reciente
```

## 8. Casos de Uso

### Usuario sin Certificado
- Puede autenticarse con Metamask
- Puede ver información (operaciones de lectura)
- NO puede ejecutar operaciones que modifiquen estado

### Usuario con Certificado
- Autenticación completa
- Puede firmar y ejecutar operaciones
- Todas las acciones quedan firmadas criptográficamente

### Revocación
- Admin puede revocar certificado de usuario
- Usuario mantiene identidad (wallet) pero pierde capacidad de firmar
- Puede solicitar nuevo certificado al admin

## 9. Beneficios del Sistema

1. **Identidad Descentralizada**: Wallet como identidad única
2. **No Repudio**: Todas las operaciones firmadas con certificado
3. **Flexibilidad**: Usuarios pueden cambiar wallet manteniendo certificado
4. **Seguridad**: Doble validación (Metamask + Certificado)
5. **Auditoría**: Registro completo de quién hizo qué y cuándo
6. **Escalable**: Funciona igual para todos los roles
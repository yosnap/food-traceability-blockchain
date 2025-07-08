# 🍎 Food Traceability Blockchain Platform

Sistema de trazabilidad de alimentos basado en Hyperledger Fabric con gestión inteligente de fechas de caducidad y notificaciones automáticas.

## 🎯 Características Principales

- ✅ **Trazabilidad Completa**: Seguimiento desde productor hasta consumidor final
- ⏰ **Gestión de Caducidad**: Control automático de fechas de vencimiento
- 📱 **App Móvil**: Aplicación nativa con notificaciones push
- 🔔 **Alertas Inteligentes**: Notificaciones personalizables 1-2 días antes del vencimiento
- 🏭 **Multi-Actor**: Sistema completo para toda la cadena de suministro
- 🔒 **Blockchain**: Registros inmutables y transparentes

## 🏗️ Arquitectura del Sistema

### Actores de la Cadena de Suministro
```
Productor → Procesador → Distribuidor → Minorista → Consumidor
    ↓           ↓            ↓           ↓          ↓
   📝 Registro de productos y fechas de caducidad
    ↓           ↓            ↓           ↓          ↓
   ⛓️  Blockchain Hyperledger Fabric (Registro Inmutable)
    ↓           ↓            ↓           ↓          ↓
   🔔 Sistema de Notificaciones Automáticas
```

### Componentes Técnicos
- **Blockchain**: Hyperledger Fabric con smart contracts
- **Backend**: Node.js + Express + Fabric SDK
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Mobile**: React Native + Expo
- **Database**: CouchDB (integrada con Fabric)
- **Notifications**: Push notifications + Email alerts

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** 18.x o superior
- **npm** 9.x o superior
- **Docker** y **Docker Compose**
- **MetaMask** (extensión del navegador)

### Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/codecrypto-academy/pfm-traza-hlf-2025.git
cd food-traceability-blockchain

# 2. Instalar dependencias
# API
cd api && npm install

# Frontend
cd ../web && npm install

# Chaincode
cd ../chaincode && npm install
```

### Inicio Rápido - Levantar Todo el Sistema

```bash
# Desde el directorio raíz del proyecto
./scripts/launch-fabric.sh
```

Este script automáticamente:
- ✅ Levanta la red Hyperledger Fabric con docker-compose
- ✅ Crea el canal `mychannel`
- ✅ Despliega el chaincode `food-traceability` con política `OR('Org1MSP.member')`
- ✅ Inicia la API en puerto 3001
- ✅ Inicia el Frontend en puerto 3000

### Detener Todo el Sistema

```bash
# Desde el directorio raíz del proyecto
./scripts/stop-all.sh
```

### Acceso a la Aplicación

Una vez levantado el sistema:

- **🌐 Aplicación Web**: http://localhost:3000
- **🔌 API Backend**: http://localhost:3001
- **📊 Health Check**: http://localhost:3001/api/health

## 📱 Funcionalidades de la App Móvil

### Para Consumidores
- 📊 **Dashboard**: Productos próximos a caducar
- 📷 **Scanner QR**: Escanear productos para ver trazabilidad
- 🔔 **Notificaciones**: Alertas personalizables de vencimiento
- 📝 **Inventario**: Gestión de productos en casa
- ⚙️ **Configuración**: Días de anticipación para alertas

### Para Productores/Comerciantes
- 📦 **Gestión de Lotes**: Crear y rastrear productos
- 🔄 **Transferencias**: Enviar productos a siguientes actores
- 📈 **Analytics**: Estadísticas de productos y movimientos
- 🏷️ **Etiquetado**: Generar códigos QR para productos

## 🔧 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- Docker & Docker Compose
- Git
- Expo CLI (para desarrollo móvil)

### Configuración del Entorno
```bash
# Instalar Hyperledger Fabric
curl -sSL https://bit.ly/2ysbOFE | bash -s 2.5.4

# Configurar variables de entorno
export PATH=${PWD}/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=${PWD}/fabric-samples/config/

# Iniciar red de desarrollo
cd fabric-samples/test-network
./network.sh up createChannel -ca -s couchdb
```

### Estructura del Proyecto
```
food-traceability-blockchain/
├── chaincode/              # Smart contracts de Hyperledger Fabric
│   ├── src/
│   │   ├── contracts/      # Contratos principales
│   │   ├── models/         # Modelos de datos
│   │   └── utils/          # Utilidades
├── api/                    # Backend Node.js
│   ├── src/
│   │   ├── controllers/    # Controladores de API
│   │   ├── services/       # Servicios de negocio
│   │   ├── routes/         # Rutas de API
│   │   └── middleware/     # Middlewares
├── web/                    # Frontend Next.js
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas Next.js
│   │   └── hooks/          # Custom hooks
├── mobile-app/             # Aplicación React Native
│   ├── src/
│   │   ├── screens/        # Pantallas
│   │   ├── components/     # Componentes móviles
│   │   └── services/       # Servicios API
├── docs/                   # Documentación
└── scripts/                # Scripts de configuración
```

## 🧪 Testing

```bash
# Tests del chaincode
cd chaincode && npm test

# Tests del API
cd api && npm test

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e
```

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm run deploy
```

## 📊 Casos de Uso

### 1. Productor Agrícola
- Registra lote de tomates con fecha de cosecha
- Establece fecha de caducidad recomendada
- Transfiere a procesador de alimentos

### 2. Procesador de Alimentos
- Recibe tomates, crea salsa de tomate
- Actualiza fecha de caducidad del producto procesado
- Transfiere a distribuidor

### 3. Consumidor Final
- Escanea QR de la salsa en el supermercado
- Ve toda la trazabilidad (origen, procesamiento, distribución)
- Configura alerta para 2 días antes del vencimiento
- Recibe notificación push cuando está por caducar

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

**Proyecto**: Food Traceability Blockchain
**Desarrollador**: Paulo
**Email**: [tu-email@example.com]
**GitHub**: [https://github.com/tu-usuario/food-traceability-blockchain]

---

⭐ Si este proyecto te resulta útil, ¡no olvides darle una estrella!
#!/bin/bash
set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Configurando Hyperledger Fabric para Food Traceability..."

# Obtener directorio del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
print_status "Directorio del proyecto: $PROJECT_ROOT"

# Configurar variables de entorno
export PATH="$PROJECT_ROOT/fabric-samples/bin:$PATH"
export FABRIC_CFG_PATH="$PROJECT_ROOT/fabric-samples/config/"

print_status "Variables de entorno configuradas:"
print_status "PATH incluye: $PROJECT_ROOT/fabric-samples/bin"
print_status "FABRIC_CFG_PATH: $FABRIC_CFG_PATH"

# Verificar que Docker está ejecutándose
if ! docker info >/dev/null 2>&1; then
    print_error "Docker no está ejecutándose. Por favor:"
    print_error "1. Abre Docker Desktop"
    print_error "2. Espera a que esté completamente iniciado"
    print_error "3. Ejecuta este script nuevamente"
    exit 1
fi

print_success "Docker está ejecutándose ✓"

# Verificar binarios de Fabric
if [ ! -f "$PROJECT_ROOT/fabric-samples/bin/peer" ]; then
    print_error "Binarios de Fabric no encontrados. Ejecuta primero:"
    print_error "curl -sSL https://bit.ly/2ysbOFE | bash -s 2.5.4 1.5.7"
    exit 1
fi

print_success "Binarios de Hyperledger Fabric encontrados ✓"

# Entrar al directorio test-network
cd "$PROJECT_ROOT/fabric-samples/test-network"

print_status "Entrando al directorio test-network..."

# Limpiar cualquier red anterior
print_status "Limpiando redes anteriores..."
./network.sh down

# Iniciar la red con CA y CouchDB
print_status "Iniciando red de Hyperledger Fabric..."
print_status "Configuración: test-network + CA + CouchDB"

./network.sh up createChannel -ca -s couchdb

if [ $? -eq 0 ]; then
    print_success "🎉 Red de Hyperledger Fabric iniciada correctamente!"
    
    echo ""
    print_status "📋 Estado de la red:"
    print_status "- Canal: mychannel"
    print_status "- Organizaciones: Org1MSP, Org2MSP"
    print_status "- CA: Habilitada"
    print_status "- Base de datos: CouchDB"
    
    echo ""
    print_status "🔧 Verificando contenedores Docker:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    print_success "¡La red está lista para desplegar chaincode!"
    
    echo ""
    print_status "📝 Próximo paso:"
    print_status "Ejecutar: ./scripts/setup/deploy-chaincode.sh"
    
else
    print_error "Error al iniciar la red de Fabric"
    exit 1
fi

# Crear archivo de variables de entorno para futuras sesiones
cat > "$PROJECT_ROOT/.env.fabric" << EOF
# Variables de entorno para Hyperledger Fabric
export PATH="$PROJECT_ROOT/fabric-samples/bin:\$PATH"
export FABRIC_CFG_PATH="$PROJECT_ROOT/fabric-samples/config/"

# Información de la red
export CHANNEL_NAME="mychannel"
export CHAINCODE_NAME="foodtraceability"
export CHAINCODE_VERSION="1.0"
export CHAINCODE_SEQUENCE="1"

# Organización 1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

echo "Variables de entorno de Fabric cargadas ✓"
EOF

print_status "Archivo .env.fabric creado para cargar variables en futuras sesiones"
print_status "Para cargar las variables: source .env.fabric"

echo ""
print_success "🎉 Configuración de Hyperledger Fabric completada!"
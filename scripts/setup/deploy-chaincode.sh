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

echo "🚀 Desplegando chaincode de Food Traceability..."

# Usar el enlace simbólico sin espacios
PROJECT_ROOT="/Users/paulo/food-traceability"
print_status "Directorio del proyecto: $PROJECT_ROOT"

# Cargar variables de entorno si existen
if [ -f "$PROJECT_ROOT/.env.fabric" ]; then
    source "$PROJECT_ROOT/.env.fabric"
    print_status "Variables de entorno cargadas desde .env.fabric"
else
    # Configurar variables básicas
    export PATH="$PROJECT_ROOT/fabric-samples/bin:$PATH"
    export FABRIC_CFG_PATH="$PROJECT_ROOT/fabric-samples/config/"
    export CHANNEL_NAME="mychannel"
    export CHAINCODE_NAME="foodtraceability"
    export CHAINCODE_VERSION="1.0"
    export CHAINCODE_SEQUENCE="1"
    print_status "Variables de entorno configuradas"
fi

# Verificar que Docker está ejecutándose
if ! docker info >/dev/null 2>&1; then
    print_error "Docker no está ejecutándose. Inicia Docker Desktop primero."
    exit 1
fi

print_success "Docker está ejecutándose ✓"

# Verificar que la red está funcionando
print_status "Verificando red de Hyperledger Fabric..."
cd "$PROJECT_ROOT/fabric-samples/test-network"

# Verificar contenedores
CONTAINERS_RUNNING=$(docker ps --filter "name=peer0.org1.example.com" --filter "name=peer0.org2.example.com" --filter "name=orderer.example.com" --format "{{.Names}}" | wc -l)

if [ "$CONTAINERS_RUNNING" -lt 3 ]; then
    print_error "La red de Fabric no está funcionando completamente."
    print_status "Ejecutando ./network.sh up createChannel -ca -s couchdb"
    ./network.sh up createChannel -ca -s couchdb
fi

print_success "Red de Fabric verificada ✓"

# Compilar chaincode
print_status "Compilando chaincode..."
cd "$PROJECT_ROOT/chaincode"
npm run build

if [ $? -eq 0 ]; then
    print_success "Chaincode compilado exitosamente ✓"
else
    print_error "Error al compilar chaincode"
    exit 1
fi

# Volver al directorio test-network
cd "$PROJECT_ROOT/fabric-samples/test-network"

# Configurar variables de entorno para Org1
print_status "Configurando entorno para Org1..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

# Empaquetar chaincode
print_status "Empaquetando chaincode..."
peer lifecycle chaincode package "$CHAINCODE_NAME.tar.gz" \\
    --path "$PROJECT_ROOT/chaincode" \\
    --lang node \\
    --label "$CHAINCODE_NAME"_"$CHAINCODE_VERSION"

if [ $? -eq 0 ]; then
    print_success "Chaincode empaquetado exitosamente ✓"
else
    print_error "Error al empaquetar chaincode"
    exit 1
fi

# Instalar chaincode en Org1
print_status "Instalando chaincode en Org1..."
peer lifecycle chaincode install "$CHAINCODE_NAME.tar.gz"

if [ $? -eq 0 ]; then
    print_success "Chaincode instalado en Org1 ✓"
else
    print_error "Error al instalar chaincode en Org1"
    exit 1
fi

# Configurar variables de entorno para Org2
print_status "Configurando entorno para Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
export CORE_PEER_ADDRESS=localhost:9051

# Instalar chaincode en Org2
print_status "Instalando chaincode en Org2..."
peer lifecycle chaincode install "$CHAINCODE_NAME.tar.gz"

if [ $? -eq 0 ]; then
    print_success "Chaincode instalado en Org2 ✓"
else
    print_error "Error al instalar chaincode en Org2"
    exit 1
fi

# Obtener Package ID
print_status "Obteniendo Package ID..."
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r ".installed_chaincodes[] | select(.label==\"${CHAINCODE_NAME}_${CHAINCODE_VERSION}\") | .package_id")

if [ -z "$PACKAGE_ID" ]; then
    print_error "No se pudo obtener el Package ID"
    exit 1
fi

print_success "Package ID obtenido: $PACKAGE_ID"

# Aprobar chaincode para Org2
print_status "Aprobando chaincode para Org2..."
peer lifecycle chaincode approveformyorg \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile "$PROJECT_ROOT/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \\
    --channelID "$CHANNEL_NAME" \\
    --name "$CHAINCODE_NAME" \\
    --version "$CHAINCODE_VERSION" \\
    --package-id "$PACKAGE_ID" \\
    --sequence "$CHAINCODE_SEQUENCE"

if [ $? -eq 0 ]; then
    print_success "Chaincode aprobado para Org2 ✓"
else
    print_error "Error al aprobar chaincode para Org2"
    exit 1
fi

# Configurar variables de entorno para Org1 nuevamente
print_status "Configurando entorno para Org1..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_ADDRESS=localhost:7051

# Aprobar chaincode para Org1
print_status "Aprobando chaincode para Org1..."
peer lifecycle chaincode approveformyorg \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile "$PROJECT_ROOT/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \\
    --channelID "$CHANNEL_NAME" \\
    --name "$CHAINCODE_NAME" \\
    --version "$CHAINCODE_VERSION" \\
    --package-id "$PACKAGE_ID" \\
    --sequence "$CHAINCODE_SEQUENCE"

if [ $? -eq 0 ]; then
    print_success "Chaincode aprobado para Org1 ✓"
else
    print_error "Error al aprobar chaincode para Org1"
    exit 1
fi

# Verificar estado de aprobación
print_status "Verificando estado de aprobación..."
peer lifecycle chaincode checkcommitreadiness \\
    --channelID "$CHANNEL_NAME" \\
    --name "$CHAINCODE_NAME" \\
    --version "$CHAINCODE_VERSION" \\
    --sequence "$CHAINCODE_SEQUENCE" \\
    --output json

# Hacer commit del chaincode
print_status "Haciendo commit del chaincode..."
peer lifecycle chaincode commit \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile "$PROJECT_ROOT/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \\
    --channelID "$CHANNEL_NAME" \\
    --name "$CHAINCODE_NAME" \\
    --version "$CHAINCODE_VERSION" \\
    --sequence "$CHAINCODE_SEQUENCE" \\
    --peerAddresses localhost:7051 \\
    --tlsRootCertFiles "$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \\
    --peerAddresses localhost:9051 \\
    --tlsRootCertFiles "$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

if [ $? -eq 0 ]; then
    print_success "Chaincode committed exitosamente ✓"
else
    print_error "Error al hacer commit del chaincode"
    exit 1
fi

# Verificar que el chaincode está desplegado
print_status "Verificando despliegue del chaincode..."
peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CHAINCODE_NAME"

# Probar el chaincode con una función ping
print_status "Probando chaincode con función ping..."
peer chaincode invoke \\
    -o localhost:7050 \\
    --ordererTLSHostnameOverride orderer.example.com \\
    --tls \\
    --cafile "$PROJECT_ROOT/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \\
    -C "$CHANNEL_NAME" \\
    -n "$CHAINCODE_NAME" \\
    --peerAddresses localhost:7051 \\
    --tlsRootCertFiles "$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \\
    --peerAddresses localhost:9051 \\
    --tlsRootCertFiles "$PROJECT_ROOT/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \\
    -c '{"function":"FoodTraceabilityContract:ping","Args":[]}'

if [ $? -eq 0 ]; then
    print_success "¡Chaincode funcionando correctamente! ✅"
else
    print_warning "Chaincode desplegado pero la prueba ping falló"
fi

echo ""
print_success "🎉 ¡Chaincode de Food Traceability desplegado exitosamente!"

echo ""
print_status "📋 Información del despliegue:"
print_status "- Nombre: $CHAINCODE_NAME"
print_status "- Versión: $CHAINCODE_VERSION"
print_status "- Canal: $CHANNEL_NAME"
print_status "- Package ID: $PACKAGE_ID"

echo ""
print_status "🧪 Para probar el chaincode:"
echo "peer chaincode invoke -C $CHANNEL_NAME -n $CHAINCODE_NAME -c '{\"function\":\"FoodTraceabilityContract:ping\",\"Args\":[]}'"

echo ""
print_status "📝 Próximo paso:"
print_status "Configurar la API backend para conectar con el chaincode"
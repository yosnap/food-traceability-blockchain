#!/bin/bash
# Script wrapper para lanzar Fabric, API y Frontend desde cualquier directorio

# Colores para los mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

print_message "Iniciando red de Fabric con Docker Compose..."
cd "$PROJECT_ROOT/fabric-samples/test-network"

# Limpiar cualquier red anterior
print_message "Limpiando configuración anterior..."
./network.sh down 2>/dev/null || true

# Usar el método correcto del repositorio base
print_message "Levantando red y creando canal..."
./network.sh up createChannel -ca -c mychannel

# Desplegar chaincode con política simple
print_message "Desplegando chaincode con política simple..."
./network.sh deployCC -ccn food-traceability -ccp ../../chaincode -ccl typescript -c mychannel -ccep "OR('Org1MSP.member')"

print_message "Matando procesos en puertos 3000 y 3001..."
# Matar procesos en puerto 3001 (API)
if lsof -i:3001 >/dev/null 2>&1; then
    PID=$(lsof -ti:3001)
    print_warning "Matando proceso en puerto 3001 (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    sleep 2
fi

# Matar procesos en puerto 3000 (Frontend)
if lsof -i:3000 >/dev/null 2>&1; then
    PID=$(lsof -ti:3000)
    print_warning "Matando proceso en puerto 3000 (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    sleep 2
fi

print_message "Iniciando API en puerto 3001..."
cd "$PROJECT_ROOT/api"
# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    print_message "Instalando dependencias de la API..."
    npm install
fi

# Compilar TypeScript si es necesario
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    print_message "Compilando la API..."
    npm run build
fi

# Iniciar API en background
PORT=3001 npm start > "$PROJECT_ROOT/api.log" 2>&1 &
API_PID=$!
echo $API_PID > "$PROJECT_ROOT/api.pid"

print_message "Iniciando Frontend en puerto 3000..."
cd "$PROJECT_ROOT/web"
# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    print_message "Instalando dependencias del Frontend..."
    npm install
fi

# Configurar variable de entorno para la API
export NEXT_PUBLIC_API_URL=http://localhost:3001

# Iniciar Frontend en background
PORT=3000 npm run dev > "$PROJECT_ROOT/web.log" 2>&1 &
WEB_PID=$!
echo $WEB_PID > "$PROJECT_ROOT/web.pid"

print_message "Esperando a que los servicios estén listos..."
sleep 8

# Verificar que los servicios estén funcionando
print_message "Verificando servicios..."

# Verificar API
if kill -0 $API_PID 2>/dev/null && curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    print_success "API funcionando en puerto 3001 (PID: $API_PID)"
else
    print_error "Error al iniciar la API. Revisa $PROJECT_ROOT/api.log"
fi

# Verificar Frontend
if kill -0 $WEB_PID 2>/dev/null && curl -s http://localhost:3000 >/dev/null 2>&1; then
    print_success "Frontend funcionando en puerto 3000 (PID: $WEB_PID)"
else
    print_error "Error al iniciar el Frontend. Revisa $PROJECT_ROOT/web.log"
fi

echo ""
print_success "¡Sistema iniciado completamente!"
echo ""
echo "URLs de acceso:"
echo "  - Aplicación Web: http://localhost:3000"
echo "  - API Backend: http://localhost:3001"
echo "  - API Health: http://localhost:3001/api/health"
echo ""
echo "PIDs de los procesos:"
echo "  - API: $API_PID"
echo "  - Frontend: $WEB_PID"
echo ""
echo "Para ver los logs:"
echo "  - API: tail -f $PROJECT_ROOT/api.log"
echo "  - Frontend: tail -f $PROJECT_ROOT/web.log"
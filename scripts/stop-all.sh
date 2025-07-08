#!/bin/bash
# Script para detener todos los servicios

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
    echo -e "${GREEN}${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}${NC} $1"
}

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

print_message "Deteniendo todos los servicios..."

# Detener API
if [ -f "$PROJECT_ROOT/api.pid" ]; then
    API_PID=$(cat "$PROJECT_ROOT/api.pid")
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        print_success "API detenida (PID: $API_PID)"
    else
        print_warning "El proceso de API no estaba corriendo"
    fi
    rm -f "$PROJECT_ROOT/api.pid"
else
    # Intentar encontrar por puerto
    if lsof -i:3001 >/dev/null 2>&1; then
        PID=$(lsof -ti:3001)
        kill -9 $PID 2>/dev/null || true
        print_success "API detenida (PID: $PID)"
    else
        print_warning "No se encontró API corriendo en puerto 3001"
    fi
fi

# Detener Frontend
if [ -f "$PROJECT_ROOT/web.pid" ]; then
    WEB_PID=$(cat "$PROJECT_ROOT/web.pid")
    if kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID
        print_success "Frontend detenido (PID: $WEB_PID)"
    else
        print_warning "El proceso de Frontend no estaba corriendo"
    fi
    rm -f "$PROJECT_ROOT/web.pid"
else
    # Intentar encontrar por puerto
    if lsof -i:3000 >/dev/null 2>&1; then
        PID=$(lsof -ti:3000)
        kill -9 $PID 2>/dev/null || true
        print_success "Frontend detenido (PID: $PID)"
    else
        print_warning "No se encontró Frontend corriendo en puerto 3000"
    fi
fi

# Detener red de Fabric
print_message "Deteniendo red de Fabric..."
cd "$PROJECT_ROOT/fabric-samples/test-network"
./network.sh down

# Limpiar archivos de log
print_message "Limpiando archivos de log..."
rm -f "$PROJECT_ROOT/api.log" "$PROJECT_ROOT/web.log"

print_success "¡Todos los servicios han sido detenidos!"
#!/bin/bash
set -e

echo "🚀 Instalando dependencias del proyecto Food Traceability..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes coloreados
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

# Verificar prerrequisitos
print_status "Verificando prerrequisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Instala Node.js 18+ primero."
    print_status "Descarga desde: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versión $NODE_VERSION detectada. Se requiere versión 18 o superior."
    exit 1
fi

print_success "Node.js $(node --version) ✓"

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado."
    exit 1
fi

print_success "npm $(npm --version) ✓"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    print_warning "Docker no está instalado. Es necesario para Hyperledger Fabric."
    print_status "Descarga desde: https://www.docker.com/products/docker-desktop"
    print_status "Continuando con la instalación de dependencias..."
else
    print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) ✓"
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose no está instalado. Es necesario para Hyperledger Fabric."
else
    print_success "Docker Compose $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1) ✓"
fi

print_success "Prerrequisitos verificados"
echo ""

# Función para instalar dependencias de un módulo
install_module() {
    local module_name=$1
    local module_path=$2
    
    if [ -d "$module_path" ]; then
        print_status "Instalando dependencias de $module_name..."
        cd "$module_path"
        
        if [ -f "package.json" ]; then
            npm install
            print_success "$module_name - Dependencias instaladas ✓"
        else
            print_warning "$module_name - No se encontró package.json"
        fi
        
        cd - > /dev/null
    else
        print_warning "$module_name - Directorio no encontrado: $module_path"
    fi
}

# Instalar dependencias del proyecto principal
print_status "Instalando dependencias del proyecto principal..."
npm install
print_success "Dependencias principales instaladas ✓"

echo ""

# Instalar dependencias de cada módulo
install_module "Chaincode" "chaincode"
install_module "API Backend" "api"
install_module "Frontend Web" "web"
install_module "Aplicación Móvil" "mobile-app"

echo ""
print_success "🎉 ¡Todas las dependencias instaladas correctamente!"

echo ""
echo "📋 Próximos pasos:"
echo "1. Configurar Hyperledger Fabric:"
echo "   ./scripts/setup/setup-fabric.sh"
echo ""
echo "2. Desplegar chaincode:"
echo "   ./scripts/setup/deploy-chaincode.sh"
echo ""
echo "3. Iniciar servicios de desarrollo:"
echo "   npm run dev"
echo ""
echo "4. Para la aplicación móvil:"
echo "   cd mobile-app && npm start"
echo ""

print_status "Consulta DESARROLLO-POR-FASES.md para el plan completo de desarrollo."

echo ""
print_success "¡Configuración inicial completada! 🚀"
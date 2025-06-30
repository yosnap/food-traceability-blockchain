#!/bin/bash

# Script para configurar usuario administrador
# Uso: ./setup-admin.sh

echo "🚀 Configurando usuario administrador..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_URL="http://localhost:3001"
ADMIN_EMAIL="admin@foodtraceability.com"

echo -e "${BLUE}📡 Verificando conexión con API...${NC}"

# Verificar que la API esté disponible
if curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ API disponible en ${API_URL}${NC}"
else
    echo -e "${RED}❌ Error: API no disponible en ${API_URL}${NC}"
    echo -e "${YELLOW}💡 Asegúrate de ejecutar: cd api && npm start${NC}"
    exit 1
fi

echo -e "${BLUE}👤 Creando usuario administrador...${NC}"

# Crear usuario admin
RESPONSE=$(curl -s -X POST "${API_URL}/api/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "admin-001",
    "name": "Administrador Principal",
    "role": "ADMIN",
    "email": "admin@foodtraceability.com",
    "phone": "+57-1-234-5678",
    "location": {
      "country": "Colombia",
      "state": "Bogotá",
      "city": "Bogotá",
      "address": "Calle de la Innovación #123"
    },
    "licenseNumber": "ADMIN-FOOD-TRACE-001"
  }')

# Verificar respuesta
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Usuario administrador creado exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}📋 Detalles del usuario:${NC}"
    echo -e "   • Email: ${ADMIN_EMAIL}"
    echo -e "   • Address: admin-001"
    echo -e "   • Rol: ADMIN"
    echo -e "   • Nombre: Administrador Principal"
    echo ""
    echo -e "${YELLOW}🔐 Credenciales para el frontend:${NC}"
    echo -e "   • Usuario: ${ADMIN_EMAIL}"
    echo -e "   • Address: admin-001"
    echo ""
    echo -e "${GREEN}🎉 ¡Configuración completada!${NC}"
    echo -e "${BLUE}💡 Ahora puedes acceder al panel de administración${NC}"
else
    echo -e "${RED}❌ Error creando usuario administrador${NC}"
    echo -e "${YELLOW}📄 Respuesta del servidor:${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    
    # Verificar si el usuario ya existe
    if echo "$RESPONSE" | grep -q "already exists\|ya existe"; then
        echo ""
        echo -e "${YELLOW}⚠️  El usuario administrador ya existe${NC}"
        echo -e "${BLUE}💡 Puedes usar las credenciales existentes:${NC}"
        echo -e "   • Email: ${ADMIN_EMAIL}"
        echo -e "   • Address: admin-001"
    fi
fi

echo ""
echo -e "${BLUE}🔧 Comandos útiles:${NC}"
echo -e "   • Verificar usuario: ${YELLOW}curl ${API_URL}/api/users/admin-001${NC}"
echo -e "   • Ver logs API: ${YELLOW}tail -f api/api.log${NC}"
echo -e "   • Acceder frontend: ${YELLOW}http://localhost:3000${NC}"
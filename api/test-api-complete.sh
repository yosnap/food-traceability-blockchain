#!/bin/bash

# 🧪 Script completo de testing para Food Traceability API
# Autor: Food Traceability Team
# Fecha: 29 de Junio, 2025

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BASE_URL="http://localhost:3001"
PRODUCER_TOKEN="producer-token"
PROCESSOR_TOKEN="processor-token"
DISTRIBUTOR_TOKEN="distributor-token"
RETAILER_TOKEN="retailer-token"
CONSUMER_TOKEN="consumer-token"
ADMIN_TOKEN="admin-token"

# Variables globales
PRODUCT_ID="PROD-$(date +%s)"
BATCH_NUMBER="BATCH-2024-$(date +%s)"
USER_ADDRESS="0x$(date +%s)1234567890123456789012345678901234567890"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Funciones de utilidad
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}🧪 $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "\n${YELLOW}Test $TEST_COUNT: $1${NC}"
}

print_success() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Función para hacer requests HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local expected_status=${5:-200}
    
    local url="$BASE_URL$endpoint"
    local headers=""
    
    if [ ! -z "$token" ]; then
        headers="-H 'Authorization: $token'"
    fi
    
    if [ ! -z "$data" ]; then
        headers="$headers -H 'Content-Type: application/json'"
    fi
    
    local cmd="curl -s -w '%{http_code}' -X $method $headers"
    if [ ! -z "$data" ]; then
        cmd="$cmd -d '$data'"
    fi
    cmd="$cmd '$url'"
    
    local response=$(eval $cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "Status: $status_code"
        if [ ! -z "$body" ] && [ "$body" != "null" ]; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
        return 0
    else
        print_error "Expected $expected_status, got $status_code"
        echo "Response: $body"
        return 1
    fi
}

# Verificar que la API esté ejecutándose
check_api_status() {
    print_header "Verificando estado de la API"
    
    print_test "Conectividad básica"
    if curl -s --connect-timeout 5 "$BASE_URL/test" >/dev/null; then
        print_success "API está ejecutándose en $BASE_URL"
    else
        print_error "No se puede conectar a la API en $BASE_URL"
        print_info "Asegúrate de que la API esté ejecutándose con: npm run dev"
        exit 1
    fi
}

# Tests de endpoints públicos
test_public_endpoints() {
    print_header "Testing Endpoints Públicos"
    
    print_test "Health Check"
    make_request "GET" "/api/health" "" ""
    
    print_test "System Info"
    make_request "GET" "/api/info" "" ""
    
    print_test "Basic Test"
    make_request "GET" "/test" "" ""
    
    print_test "Detailed Health Check"
    make_request "GET" "/api/health/detailed" "" ""
}

# Tests de registro de usuarios
test_user_registration() {
    print_header "Testing Registro de Usuarios"
    
    local user_data='{
        "address": "'$USER_ADDRESS'",
        "name": "Usuario Test",
        "role": "PRODUCER",
        "email": "test@ejemplo.com",
        "phone": "+34123456789",
        "location": {
            "address": "Calle Test 123",
            "city": "Madrid",
            "country": "España",
            "coordinates": {
                "lat": 40.4168,
                "lng": -3.7038
            }
        },
        "licenseNumber": "TEST-2024-001"
    }'
    
    print_test "Registrar nuevo usuario"
    make_request "POST" "/api/users/register" "" "$user_data" "201"
}

# Tests de autenticación y usuarios
test_user_endpoints() {
    print_header "Testing Endpoints de Usuarios"
    
    print_test "Obtener mi perfil (PRODUCER)"
    make_request "GET" "/api/users/me" "$PRODUCER_TOKEN" ""
    
    print_test "Actualizar perfil"
    local update_data='{
        "name": "Productor Actualizado",
        "email": "nuevo@ejemplo.com"
    }'
    make_request "PUT" "/api/users/me" "$PRODUCER_TOKEN" "$update_data"
    
    print_test "Configurar notificaciones"
    local notification_data='{
        "enableNotifications": true,
        "notificationDays": 3,
        "enableEmailNotifications": true,
        "enablePushNotifications": true
    }'
    make_request "PUT" "/api/users/me/notifications" "$CONSUMER_TOKEN" "$notification_data"
    
    print_test "Obtener configuración de notificaciones"
    make_request "GET" "/api/users/me/notifications" "$CONSUMER_TOKEN" ""
}

# Tests de productos
test_food_endpoints() {
    print_header "Testing Endpoints de Productos"
    
    print_test "Ping al chaincode"
    make_request "GET" "/api/food/ping" "$PRODUCER_TOKEN" "" "200"
    
    print_test "Crear producto (PRODUCER)"
    local product_data='{
        "id": "'$PRODUCT_ID'",
        "batchNumber": "'$BATCH_NUMBER'",
        "name": "Tomates Test",
        "category": "VEGETABLES",
        "description": "Tomates para testing",
        "quantity": 100,
        "productionDate": "2025-06-29",
        "expirationDate": "2025-07-05",
        "origin": {
            "farm": "Finca Test",
            "location": "Test Location"
        },
        "storageConditions": {
            "temperature": "4°C"
        },
        "allergens": []
    }'
    make_request "POST" "/api/food/products" "$PRODUCER_TOKEN" "$product_data" "201"
    
    print_test "Obtener producto por ID"
    make_request "GET" "/api/food/products/$PRODUCT_ID" "$CONSUMER_TOKEN" ""
    
    print_test "Obtener mis productos"
    make_request "GET" "/api/food/products" "$PRODUCER_TOKEN" ""
    
    print_test "Productos por categoría"
    make_request "GET" "/api/food/products/category/VEGETABLES" "$CONSUMER_TOKEN" ""
    
    print_test "Productos próximos a caducar"
    make_request "GET" "/api/food/expiring" "$CONSUMER_TOKEN" ""
    
    print_test "Productos próximos a caducar (7 días)"
    make_request "GET" "/api/food/expiring?daysAhead=7" "$CONSUMER_TOKEN" ""
    
    print_test "Estadísticas del usuario"
    make_request "GET" "/api/food/stats" "$CONSUMER_TOKEN" ""
}

# Tests de transferencias
test_transfer_endpoints() {
    print_header "Testing Transferencias de Productos"
    
    print_test "Transferir producto"
    local transfer_data='{
        "newOwner": "0x2345678901234567890123456789012345678901",
        "transferType": "SALE",
        "location": {
            "address": "Mercado Test",
            "city": "Madrid",
            "country": "España"
        },
        "quantity": 50,
        "price": 100.0,
        "notes": "Transferencia de test"
    }'
    make_request "POST" "/api/food/products/$PRODUCT_ID/transfer" "$PRODUCER_TOKEN" "$transfer_data"
    
    print_test "Marcar como consumido"
    local consume_data='{
        "consumedDate": "2025-06-29T20:00:00Z",
        "rating": 5,
        "notes": "Producto de test consumido"
    }'
    make_request "POST" "/api/food/products/$PRODUCT_ID/consume" "$CONSUMER_TOKEN" "$consume_data"
}

# Tests de autorización
test_authorization() {
    print_header "Testing Autorización y Permisos"
    
    print_test "Endpoint sin token (debe fallar)"
    make_request "GET" "/api/food/products" "" "" "401"
    
    print_test "Token inválido (debe fallar)"
    make_request "GET" "/api/food/products" "invalid-token" "" "401"
    
    print_test "Crear producto con rol CONSUMER (debe fallar)"
    local product_data='{"id":"TEST-FAIL","name":"Test","category":"VEGETABLES"}'
    make_request "POST" "/api/food/products" "$CONSUMER_TOKEN" "$product_data" "403"
}

# Tests de validación
test_validation() {
    print_header "Testing Validación de Datos"
    
    print_test "Crear producto sin datos requeridos (debe fallar)"
    local invalid_data='{"name":"Test incompleto"}'
    make_request "POST" "/api/food/products" "$PRODUCER_TOKEN" "$invalid_data" "400"
    
    print_test "Registro de usuario con email inválido (debe fallar)"
    local invalid_user='{
        "address": "0x123",
        "name": "Test",
        "role": "INVALID_ROLE",
        "email": "email-invalido",
        "phone": "123"
    }'
    make_request "POST" "/api/users/register" "" "$invalid_user" "400"
}

# Tests de rutas inexistentes
test_404_routes() {
    print_header "Testing Rutas Inexistentes"
    
    print_test "Ruta inexistente"
    make_request "GET" "/api/nonexistent" "" "" "404"
    
    print_test "Producto inexistente"
    make_request "GET" "/api/food/products/NONEXISTENT" "$CONSUMER_TOKEN" "" "404"
}

# Generar reporte final
generate_report() {
    print_header "Reporte Final de Testing"
    
    echo -e "\n${BLUE}📊 Estadísticas de Tests:${NC}"
    echo -e "${GREEN}✅ Tests pasados: $PASS_COUNT${NC}"
    echo -e "${RED}❌ Tests fallidos: $FAIL_COUNT${NC}"
    echo -e "${YELLOW}📋 Total de tests: $TEST_COUNT${NC}"
    
    local success_rate=$((PASS_COUNT * 100 / TEST_COUNT))
    echo -e "${BLUE}📈 Tasa de éxito: $success_rate%${NC}"
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ¡Todos los tests pasaron exitosamente!${NC}"
    else
        echo -e "\n${YELLOW}⚠️  Algunos tests fallaron. Revisa los logs arriba.${NC}"
    fi
    
    echo -e "\n${BLUE}📋 Información del test:${NC}"
    echo -e "🆔 Product ID usado: $PRODUCT_ID"
    echo -e "📦 Batch Number: $BATCH_NUMBER"
    echo -e "👤 User Address: $USER_ADDRESS"
    echo -e "🕐 Fecha: $(date)"
}

# Función principal
main() {
    echo -e "${BLUE}"
    echo "  ______ ____   ____  _____    _______ _____            _____ ______ _____ "
    echo " |  ____/ __ \\ / __ \\|  __ \\  |__   __|  __ \\     /\\   / ____|  ____|  __ \\ "
    echo " | |__ | |  | | |  | | |  | |    | |  | |__) |   /  \\ | |    | |__  | |__) |"
    echo " |  __|| |  | | |  | | |  | |    | |  |  _  /   / /\\ \\| |    |  __| |  _  / "
    echo " | |   | |__| | |__| | |__| |    | |  | | \\ \\  / ____ \\ |____| |____| | \\ \\ "
    echo " |_|    \\____/ \\____/|_____/     |_|  |_|  \\_\\/_/    \\_\\_____|______|_|  \\_\\\\"
    echo -e "${NC}"
    echo -e "${BLUE}                        API Testing Suite${NC}"
    echo -e "${BLUE}                     Food Traceability System${NC}\n"
    
    # Verificar dependencias
    if ! command -v curl &> /dev/null; then
        print_error "curl no está instalado"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_info "jq no está instalado - el output JSON no será formateado"
    fi
    
    # Ejecutar todos los tests
    check_api_status
    test_public_endpoints
    test_user_registration
    test_user_endpoints
    test_food_endpoints
    test_transfer_endpoints
    test_authorization
    test_validation
    test_404_routes
    
    # Generar reporte
    generate_report
}

# Verificar si se pasó un parámetro para ejecutar tests específicos
if [ $# -eq 0 ]; then
    main
else
    case $1 in
        "public")
            check_api_status
            test_public_endpoints
            ;;
        "users")
            check_api_status
            test_user_registration
            test_user_endpoints
            ;;
        "food")
            check_api_status
            test_food_endpoints
            ;;
        "auth")
            check_api_status
            test_authorization
            ;;
        "validation")
            check_api_status
            test_validation
            ;;
        *)
            echo "Uso: $0 [public|users|food|auth|validation]"
            echo "Sin parámetros ejecuta todos los tests"
            exit 1
            ;;
    esac
    generate_report
fi
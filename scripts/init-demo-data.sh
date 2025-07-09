#!/bin/bash

# Script de inicialización con datos de ejemplo para presentación
# Crea ~50 productos distribuidos entre todos los roles con transferencias realistas

set -e

# Configuración
API_BASE_URL="http://localhost:3001/api"
SLEEP_TIME=0.5

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para hacer peticiones HTTP
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local wallet=$4
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X "$method" \
        -H "Authorization: Bearer wallet:$wallet" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_BASE_URL$endpoint")
    
    local http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    local body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        echo "$body"
        return 0
    else
        error "HTTP $http_code: $body"
        return 1
    fi
}

# Función para generar ID único
generate_product_id() {
    echo "PROD-$(date +%s)-$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"
}

# Función para generar número de lote
generate_batch_number() {
    local product_name=$1
    local prefix=$(echo "$product_name" | cut -c1-3 | tr '[:lower:]' '[:upper:]')
    local date=$(date +%Y%m%d)
    local random=$(printf "%03d" $((RANDOM % 999 + 1)))
    echo "${prefix}-${date}-${random}"
}

# Función para generar fechas
generate_dates() {
    local production_days_ago=$((RANDOM % 7 + 1))
    local expiration_days_ahead=$((RANDOM % 25 + 5))
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local production_date=$(date -v-${production_days_ago}d -u +"%Y-%m-%dT%H:%M:%S.000Z")
        local expiration_date=$(date -v+${expiration_days_ahead}d -u +"%Y-%m-%dT%H:%M:%S.000Z")
    else
        # Linux
        local production_date=$(date -d "-${production_days_ago} days" -u +"%Y-%m-%dT%H:%M:%S.000Z")
        local expiration_date=$(date -d "+${expiration_days_ahead} days" -u +"%Y-%m-%dT%H:%M:%S.000Z")
    fi
    
    echo "$production_date|$expiration_date"
}

# Wallets REALES registradas en el sistema
declare -A PRODUCERS=(
    ["0x844188335Cc64f65B5aA2490E9C1ddC133811e14"]="Finca Verde Esperanza"
    ["0xA8e7E90d5f7aF7407A08f3EdfE7AF09aCB284ECD"]="Granja Orgánica del Valle"
)

declare -A PROCESSORS=(
    ["0x6F580F65469dC6C67a5668377132480D376Ddb06"]="Procesadora Valle Verde"
)

declare -A DISTRIBUTORS=(
    ["0x1F2a486F5227fC0CD09B3b2b2F752D50cDdf9878"]="Logística Valle Central"
)

declare -A RETAILERS=(
    ["0x8Dc664D838Ad25E9bF260D9E1E76fC377FA11fF5"]="SuperMarket Plus"
)

# Productos de ejemplo
FRESH_PRODUCTS=(
    "Tomates Cherry Orgánicos|Cherry|0.5|FRESH"
    "Mangos Tommy Atkins|Tommy Atkins|1.2|FRESH"
    "Bananos Premium|Cavendish|2.0|FRESH"
    "Fresas Frescas|Albion|0.3|FRESH"
    "Piñas Golden|Golden|1.8|FRESH"
    "Aguacates Hass|Hass|0.8|FRESH"
    "Naranjas Valencia|Valencia|1.5|FRESH"
    "Lechugas Hidropónicas|Iceberg|0.4|FRESH"
    "Zanahorias Orgánicas|Nantes|0.6|FRESH"
    "Brócoli Fresco|Calabrese|0.5|FRESH"
    "Pepinos Verdes|Americano|0.3|FRESH"
    "Pimientos Rojos|California|0.4|FRESH"
    "Cebollas Dulces|Vidalia|0.8|FRESH"
    "Apio Fresco|Verde|0.5|FRESH"
    "Espinacas Tiernas|Baby|0.2|FRESH"
)

PROCESSED_PRODUCTS=(
    "Salsa de Tomate Natural|Procesado|0.5|PROCESSED"
    "Jugo de Mango 100%|Procesado|1.0|PROCESSED"
    "Mermelada de Fresa|Procesado|0.3|PROCESSED"
    "Chips de Banano|Procesado|0.2|PROCESSED"
    "Aceite de Aguacate|Procesado|0.5|PROCESSED"
    "Concentrado de Naranja|Procesado|0.8|PROCESSED"
    "Ensalada Lista|Procesado|0.3|PROCESSED"
    "Jugo Verde Detox|Procesado|0.5|PROCESSED"
)

# Función para crear producto
create_product() {
    local wallet=$1
    local name=$2
    local product_name=$3
    local variety=$4
    local weight=$5
    local category=$6
    
    local product_id=$(generate_product_id)
    local batch_number=$(generate_batch_number "$product_name")
    local dates=$(generate_dates)
    local production_date=$(echo "$dates" | cut -d'|' -f1)
    local expiration_date=$(echo "$dates" | cut -d'|' -f2)
    local quantity=$((RANDOM % 50 + 10))
    local temperature=$((RANDOM % 10 + 2))
    local humidity=$((RANDOM % 20 + 70))
    
    local data=$(cat <<EOF
{
  "id": "$product_id",
  "name": "$product_name",
  "quantity": $quantity,
  "batchNumber": "$batch_number",
  "productionDate": "$production_date",
  "expirationDate": "$expiration_date",
  "category": "$category",
  "variety": "$variety",
  "weight": $weight,
  "description": "$product_name de alta calidad producido por $name",
  "brand": "$name",
  "origin": {
    "farmName": "$name",
    "location": "Costa Rica",
    "coordinates": { "lat": 9.7489, "lng": -83.7534 }
  },
  "storageConditions": {
    "temperature": $temperature,
    "humidity": $humidity
  },
  "certifications": ["Orgánico", "HACCP", "BPA"],
  "allergens": [],
  "walletAddress": "$wallet",
  "signature": "signature_$product_id"
}
EOF
)
    
    log "📦 Creando producto: $product_name ($name)"
    
    if make_request "POST" "/food/create" "$data" "$wallet" > /dev/null 2>&1; then
        echo "$product_id|$wallet|$quantity"
        return 0
    else
        error "Error creando producto $product_name"
        return 1
    fi
}

# Función para transferir producto
transfer_product() {
    local product_id=$1
    local from_wallet=$2
    local to_wallet=$3
    local to_name=$4
    local quantity=$5
    local transfer_type=$6
    local delivery_time=${7:-0}
    
    local data=$(cat <<EOF
{
  "newOwner": "$to_wallet",
  "transferType": "$transfer_type",
  "location": {
    "address": "$to_name",
    "city": "San José",
    "country": "Costa Rica"
  },
  "quantity": $quantity,
  "conditions": "Transferencia de $transfer_type",
  "notes": "Transferido a $to_name",
  "deliveryTime": $delivery_time
}
EOF
)
    
    log "🔄 Transfiriendo $quantity unidades de $product_id a $to_name"
    
    if make_request "POST" "/food/transfer/$product_id" "$data" "$from_wallet" > /dev/null 2>&1; then
        return 0
    else
        error "Error transfiriendo $product_id"
        return 1
    fi
}

# Función para obtener productos de una wallet
get_products_from_wallet() {
    local wallet=$1
    local response=$(make_request "GET" "/food/my-products" "" "$wallet" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        echo "$response" | jq -r '.data[]? | "\(.id)|\(.amount)"' 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Función principal
main() {
    log "🚀 Iniciando población de datos de ejemplo..."
    echo ""
    
    # Verificar que la API esté disponible
    if ! curl -s "$API_BASE_URL/health" > /dev/null 2>&1; then
        error "La API no está disponible en $API_BASE_URL"
        error "Por favor, asegúrate de que el servidor esté corriendo"
        exit 1
    fi
    
    # Arrays para almacenar productos creados
    declare -a created_products=()
    declare -a processed_products=()
    declare -a distributed_products=()
    declare -a retail_products=()
    
    # PASO 1: Crear productos en productores (20 productos)
    log "📋 PASO 1: Creando productos en productores..."
    echo ""
    
    local producer_wallets=($(printf '%s\n' "${!PRODUCERS[@]}"))
    local product_count=0
    
    for product_info in "${FRESH_PRODUCTS[@]}"; do
        [[ $product_count -ge 20 ]] && break
        
        IFS='|' read -r product_name variety weight category <<< "$product_info"
        local wallet=${producer_wallets[$((product_count % ${#producer_wallets[@]}))]}
        local name=${PRODUCERS[$wallet]}
        
        if result=$(create_product "$wallet" "$name" "$product_name" "$variety" "$weight" "$category"); then
            created_products+=("$result")
            ((product_count++))
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Creados ${#created_products[@]} productos en productores"
    echo ""
    
    # PASO 2: Transferir productos a procesadores (15 productos)
    log "📋 PASO 2: Transfiriendo productos a procesadores..."
    echo ""
    
    local processor_wallets=($(printf '%s\n' "${!PROCESSORS[@]}"))
    local transfer_count=0
    
    for product_info in "${created_products[@]}"; do
        [[ $transfer_count -ge 15 ]] && break
        
        IFS='|' read -r product_id from_wallet original_quantity <<< "$product_info"
        local processor_wallet=${processor_wallets[$((transfer_count % ${#processor_wallets[@]}))]}
        local processor_name=${PROCESSORS[$processor_wallet]}
        local transfer_quantity=$((original_quantity * 80 / 100))
        
        if transfer_product "$product_id" "$from_wallet" "$processor_wallet" "$processor_name" "$transfer_quantity" "PROCESSING" $((RANDOM % 4)); then
            processed_products+=("$product_id|$processor_wallet|$transfer_quantity")
            ((transfer_count++))
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Transferidos $transfer_count productos a procesadores"
    echo ""
    
    # PASO 3: Crear productos procesados (10 productos)
    log "📋 PASO 3: Creando productos procesados..."
    echo ""
    
    local processed_count=0
    
    for product_info in "${PROCESSED_PRODUCTS[@]}"; do
        [[ $processed_count -ge 10 ]] && break
        
        IFS='|' read -r product_name variety weight category <<< "$product_info"
        local wallet=${processor_wallets[$((processed_count % ${#processor_wallets[@]}))]}
        local name=${PROCESSORS[$wallet]}
        
        if result=$(create_product "$wallet" "$name" "$product_name" "$variety" "$weight" "$category"); then
            processed_products+=("$result")
            ((processed_count++))
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Creados $processed_count productos procesados"
    echo ""
    
    # PASO 4: Transferir productos a distribuidores (20 productos)
    log "📋 PASO 4: Transfiriendo productos a distribuidores..."
    echo ""
    
    local distributor_wallets=($(printf '%s\n' "${!DISTRIBUTORS[@]}"))
    transfer_count=0
    
    for product_info in "${processed_products[@]}"; do
        [[ $transfer_count -ge 20 ]] && break
        
        IFS='|' read -r product_id from_wallet quantity <<< "$product_info"
        local distributor_wallet=${distributor_wallets[$((transfer_count % ${#distributor_wallets[@]}))]}
        local distributor_name=${DISTRIBUTORS[$distributor_wallet]}
        local transfer_quantity=$((quantity * 70 / 100))
        
        if [[ $transfer_quantity -gt 0 ]]; then
            if transfer_product "$product_id" "$from_wallet" "$distributor_wallet" "$distributor_name" "$transfer_quantity" "DISTRIBUTION" $((RANDOM % 8 + 2)); then
                distributed_products+=("$product_id|$distributor_wallet|$transfer_quantity")
                ((transfer_count++))
            fi
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Transferidos $transfer_count productos a distribuidores"
    echo ""
    
    # PASO 5: Transferir productos a retailers (15 productos)
    log "📋 PASO 5: Transfiriendo productos a retailers..."
    echo ""
    
    local retailer_wallets=($(printf '%s\n' "${!RETAILERS[@]}"))
    transfer_count=0
    
    for product_info in "${distributed_products[@]}"; do
        [[ $transfer_count -ge 15 ]] && break
        
        IFS='|' read -r product_id from_wallet quantity <<< "$product_info"
        local retailer_wallet=${retailer_wallets[$((transfer_count % ${#retailer_wallets[@]}))]}
        local retailer_name=${RETAILERS[$retailer_wallet]}
        local transfer_quantity=$((quantity * 60 / 100))
        
        if [[ $transfer_quantity -gt 0 ]]; then
            if transfer_product "$product_id" "$from_wallet" "$retailer_wallet" "$retailer_name" "$transfer_quantity" "RETAIL" $((RANDOM % 6 + 1)); then
                retail_products+=("$product_id|$retailer_wallet|$transfer_quantity")
                ((transfer_count++))
            fi
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Transferidos $transfer_count productos a retailers"
    echo ""
    
    # PASO 6: Simular ventas a consumidores (5 productos)
    log "📋 PASO 6: Simulando ventas a consumidores..."
    echo ""
    
    local consumer_wallet="0xcA01956A17ABF046b8e7261BF2E6B4F41Ad1FF16"
    local consumer_name="Consumidor Final"
    local sales_count=0
    
    for product_info in "${retail_products[@]}"; do
        [[ $sales_count -ge 5 ]] && break
        
        IFS='|' read -r product_id from_wallet quantity <<< "$product_info"
        local sale_quantity=$((quantity < 3 ? quantity : 3))
        
        if [[ $sale_quantity -gt 0 ]]; then
            if transfer_product "$product_id" "$from_wallet" "$consumer_wallet" "$consumer_name" "$sale_quantity" "SALE" 0; then
                ((sales_count++))
            fi
        fi
        
        sleep $SLEEP_TIME
    done
    
    log "✅ Simuladas $sales_count ventas a consumidores"
    echo ""
    
    # Resumen final
    echo -e "${BLUE}🎉 INICIALIZACIÓN COMPLETA!${NC}"
    echo ""
    echo -e "${BLUE}📊 RESUMEN DE DATOS CREADOS:${NC}"
    echo "   📦 Productos creados: ~50"
    echo "   👥 Productores: ${#PRODUCERS[@]}"
    echo "   🏭 Procesadores: ${#PROCESSORS[@]}"
    echo "   🚚 Distribuidores: ${#DISTRIBUTORS[@]}"
    echo "   🏪 Retailers: ${#RETAILERS[@]}"
    echo "   👤 Consumidores: 1"
    echo "   💳 Wallets únicas: $((${#PRODUCERS[@]} + ${#PROCESSORS[@]} + ${#DISTRIBUTORS[@]} + ${#RETAILERS[@]} + 1))"
    echo ""
    echo -e "${GREEN}✨ La plataforma está lista para la presentación!${NC}"
}

# Ejecutar función principal
main "$@"
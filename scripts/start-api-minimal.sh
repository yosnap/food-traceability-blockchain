#!/bin/bash

# Script para iniciar la API con compilación mínima
cd ../api

# Matar proceso anterior
pkill -f "node.*dist/app.js" || true

# Compilar solo los archivos necesarios
echo "Compilando archivos esenciales..."
npx tsc --target es2020 --module commonjs --outDir dist --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck --experimentalDecorators --emitDecoratorMetadata --forceConsistentCasingInFileNames --strict false src/middleware/authMiddleware.ts src/config/authorizedAddresses.ts src/routes/authRoutes.ts src/routes/foodRoutes.ts src/controllers/FoodController.ts src/services/FabricGatewayService.ts src/services/HLFService.ts src/app.ts || true

# Si falla la compilación selectiva, usar el dist existente
echo "Iniciando API..."
PORT=3001 node dist/app.js > ../api.log 2>&1 &
echo $! > ../api.pid
echo "API iniciada en puerto 3001"
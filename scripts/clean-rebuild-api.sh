#!/bin/bash

# Script para limpiar y recompilar la API completamente

echo "🧹 Limpiando y reconstruyendo API..."

# Detener API
echo "🛑 Deteniendo API..."
if [ -f ../api.pid ]; then
    API_PID=$(cat ../api.pid)
    kill $API_PID 2>/dev/null || true
    rm -f ../api.pid
fi
pkill -f "node.*3001" || true

cd ../api

# Limpiar completamente
echo "🗑️  Limpiando cache y compilados..."
rm -rf dist
rm -rf node_modules/.cache
rm -rf .tsbuildinfo

# Recompilar
echo "🔨 Recompilando TypeScript..."
npm run build || true

# Reiniciar
echo "🚀 Reiniciando API..."
npm start > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid

echo "✅ API limpiada, recompilada y reiniciada (PID: $API_PID)"
echo "📋 Ver logs: tail -f ../api.log"
#!/bin/bash

# Script para iniciar ambos servicios: API y Frontend
echo "🚀 Iniciando servicios de Food Traceability..."

# Limpiar procesos previos
echo "🧹 Limpiando procesos previos..."
pkill -f "node.*app.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*app.ts" 2>/dev/null || true
sleep 2

# Verificar puertos libres
echo "🔍 Verificando puertos..."
if lsof -i :3001 >/dev/null 2>&1; then
    echo "❌ Puerto 3001 ocupado, matando proceso..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "❌ Puerto 3000 ocupado, matando proceso..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "✅ Puertos liberados"

# Iniciar API en background
echo "🔧 Iniciando API (puerto 3001)..."
cd "$(dirname "$0")/api"
npm start > api.log 2>&1 &
API_PID=$!
echo "📡 API iniciada con PID: $API_PID"

# Esperar a que la API esté lista
echo "⏳ Esperando a que la API esté lista..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ API respondiendo en puerto 3001"
        break
    fi
    sleep 1
    echo "⏳ Esperando API... ($i/30)"
done

# Verificar que la API responde
if ! curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "❌ Error: API no responde en puerto 3001"
    exit 1
fi

# Iniciar Frontend
echo "🌐 Iniciando Frontend (puerto 3000)..."
cd "$(dirname "$0")/web"
PORT=3000 npm run dev > web.log 2>&1 &
WEB_PID=$!
echo "🖥️ Frontend iniciado con PID: $WEB_PID"

# Esperar a que el frontend esté listo
echo "⏳ Esperando a que el frontend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend respondiendo en puerto 3000"
        break
    fi
    sleep 1
    echo "⏳ Esperando Frontend... ($i/30)"
done

# Estado final
echo ""
echo "🎉 ¡Servicios iniciados!"
echo "📡 API Backend: http://localhost:3001/api"
echo "🌐 Frontend Web: http://localhost:3000"
echo ""
echo "📋 PIDs:"
echo "  - API: $API_PID"
echo "  - Frontend: $WEB_PID"
echo ""
echo "📝 Logs:"
echo "  - API: api/api.log"
echo "  - Frontend: web/web.log"
echo ""
echo "🛑 Para detener los servicios:"
echo "  kill $API_PID $WEB_PID"
echo ""
echo "🔍 Verificar estado:"
echo "  curl http://localhost:3001/api/health"
echo "  curl http://localhost:3000"
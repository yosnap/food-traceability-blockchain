#!/bin/bash

# Script para reiniciar la API

echo "= Reiniciando API..."

# Matar proceso anterior
if [ -f ../api.pid ]; then
    API_PID=$(cat ../api.pid)
    kill $API_PID 2>/dev/null || true
    rm -f ../api.pid
fi

# Matar cualquier proceso en puerto 3001
pkill -f "node.*3001" || true

# Iniciar nueva instancia
cd ../api
echo "=€ Iniciando nueva instancia de API..."
npm start > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid

echo " API reiniciada en puerto 3001 (PID: $API_PID)"
echo "=Ë Logs: tail -f ../api.log"
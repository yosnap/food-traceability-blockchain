#!/bin/bash

# Script para iniciar la API de forma simple
cd ../api

# Matar proceso anterior
pkill -f "node.*dist/app.js" || true

# Iniciar API
echo "Iniciando API..."
PORT=3001 node dist/app.js > ../api.log 2>&1 &
API_PID=$!
echo $API_PID > ../api.pid

echo "API iniciada en puerto 3001 (PID: $API_PID)"
echo "Logs: tail -f ../api.log"
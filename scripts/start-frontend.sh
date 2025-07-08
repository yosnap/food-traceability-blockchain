#!/bin/bash

# Script para iniciar el frontend
cd ../web

# Matar proceso anterior
pkill -f "next-server" || true

# Iniciar Frontend
echo "Iniciando Frontend..."
PORT=3000 npm run dev > ../web.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > ../web.pid

echo "Frontend iniciado en puerto 3000 (PID: $WEB_PID)"
echo "Logs: tail -f ../web.log"
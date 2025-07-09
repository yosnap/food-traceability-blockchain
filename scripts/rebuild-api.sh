#!/bin/bash

echo "🔄 Reconstruyendo API..."

cd ../api

echo "📦 Limpiando archivos anteriores..."
npm run clean

echo "🔨 Compilando TypeScript..."
npm run build

echo "✅ API reconstruida exitosamente"
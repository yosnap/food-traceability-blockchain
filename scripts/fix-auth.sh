#!/bin/bash

# Script para arreglar el auth middleware
cd ../api/src/middleware

# Backup current file
cp authMiddleware.ts authMiddleware.ts.backup

# Replace with simplified version
cp authMiddleware.simple.ts authMiddleware.ts

echo "AuthMiddleware reemplazado con versión simplificada"
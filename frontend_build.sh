#!/bin/bash

set -euo pipefail

# Directorio del frontend
FRONTEND_DIR="./frontend"

echo "🚀 Entrando en el directorio $FRONTEND_DIR"
cd "$FRONTEND_DIR"

echo "📦 Instalando dependencias (npm install)..."
npm install

echo "🔨 Construyendo la app (npm run build)..."
npm run build

echo "👀 Lanzando preview en modo producción (npm run preview)..."
npm run preview

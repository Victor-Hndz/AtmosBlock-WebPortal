#!/bin/bash

set -euo pipefail

echo "🔴 ATENCIÓN: Este script eliminará TODO de Docker (contenedores, imágenes, volúmenes, redes)."
read -p "¿Estás seguro de continuar? (sí/yes para continuar): " confirm

if [[ "$confirm" != "si" && "$confirm" != "sí" && "$confirm" != "s" && "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Cancelado por el usuario."
    exit 1
fi

echo "🔄 Deteniendo y eliminando contenedores en ejecución..."
docker ps -q | xargs -r docker kill
docker ps -a -q | xargs -r docker rm -f

echo "🧼 Eliminando todas las imágenes..."
docker image ls -aq | xargs -r docker rmi -f

echo "🪣 Eliminando todos los volúmenes..."
docker volume ls -q | xargs -r docker volume rm

echo "🌐 Eliminando todas las redes personalizadas..."
docker network ls --filter "type=custom" -q | xargs -r docker network rm

echo "🧹 Ejecutando 'docker system prune' completo (incluye volúmenes e imágenes)..."
docker system prune -a --volumes -f

echo "✅ Docker limpiado completamente."
echo
echo "📊 Estado actual del sistema Docker:"
docker system df

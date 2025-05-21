#!/bin/bash

set -euo pipefail

DELETE_VOLUMES=false

# Verifica si se pasó el flag --volumes
if [[ "${1:-}" == "--volumes" ]]; then
  DELETE_VOLUMES=true
fi

echo "🔴 ATENCIÓN: Este script eliminará TODO de Docker (contenedores, imágenes, redes${DELETE_VOLUMES:+, volúmenes})."
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

if $DELETE_VOLUMES; then
  echo "🪣 Eliminando todos los volúmenes..."
  docker volume ls -q | xargs -r docker volume rm
else
  echo "⚠️ Volúmenes conservados (no se pasó la opción --volumes)."
fi

echo "🌐 Eliminando todas las redes personalizadas..."
docker network ls --filter "type=custom" -q | xargs -r docker network rm

echo "🧹 Ejecutando 'docker system prune'..."
if $DELETE_VOLUMES; then
  docker system prune -a --volumes -f
else
  docker system prune -a -f
fi

echo "✅ Docker limpiado completamente."
echo
echo "📊 Estado actual del sistema Docker:"
docker system df

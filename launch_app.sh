#!/bin/bash

set -euo pipefail

CLEAN_MODE=false
FRONTEND_MODE=false

for arg in "$@"; do
  case "$arg" in
    --clean)
      CLEAN_MODE=true
      ;;
    --front)
      FRONTEND_MODE=true
      ;;
  esac
done

if $CLEAN_MODE; then
  echo "🧨 Ejecutando limpieza completa de Docker con docker_cleanup.sh..."
  if [[ ! -x "./docker_cleanup.sh" ]]; then
    echo "❌ El archivo docker_cleanup.sh no existe o no es ejecutable."
    exit 1
  fi
  ./docker_cleanup.sh
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo ""
echo "🛠️  Iniciando compilación con Docker BuildKit..."
echo "🕒 Fecha de build: $BUILD_DATE"
echo "🔁 Commit: $VCS_REF"
echo ""

docker-compose build --parallel \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VCS_REF="$VCS_REF"

echo ""
echo "✅ Build exitoso. Iniciando contenedores..."
docker-compose up -d

echo ""
echo "🚀 Todos los servicios están levantados."
echo "📡 Usa 'docker-compose logs -f' para ver los logs en tiempo real."

if $FRONTEND_MODE; then
  if [[ ! -x "./frontend_build.sh" ]]; then
    echo "❌ El archivo ./frontend_build.sh no existe o no es ejecutable."
    exit 1
  fi
  ./frontend_build.sh
fi

#!/bin/bash

# Make sure BuildKit is enabled
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Set build arguments
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🚀 Building with Docker BuildKit..."
echo "Build date: $BUILD_DATE"
echo "Git commit: $VCS_REF"

# Build with BuildKit and parallelization
docker-compose build --parallel \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VCS_REF="$VCS_REF"

build_status=$?

if [ $build_status -eq 0 ]; then
  echo "✅ Build completed successfully!"
  echo "You can now run your application with: docker-compose up"
else
  echo "❌ Build failed with status code $build_status"
  exit $build_status
fi

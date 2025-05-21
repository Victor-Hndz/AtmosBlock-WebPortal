#!/bin/bash

# Enable Docker BuildKit by default
echo "Configuring Docker BuildKit..."
mkdir -p $HOME/.docker
cat > $HOME/.docker/config.json << EOF
{
  "features": {
    "buildkit": true
  }
}
EOF

# Export BuildKit environment variables for current session
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "Docker BuildKit has been enabled!"
echo "You can now build with improved performance using:"
echo "docker-compose build --parallel"
echo ""
echo "To make sure BuildKit is enabled for all terminal sessions, add these lines to your .bashrc:"
echo 'export DOCKER_BUILDKIT=1'
echo 'export COMPOSE_DOCKER_CLI_BUILD=1'

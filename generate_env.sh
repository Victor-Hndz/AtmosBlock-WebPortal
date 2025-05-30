#!/bin/bash

# Function to generate a secure random password
generate_secure_password() {
  local length=${1:-16}
  < /dev/urandom tr -dc 'A-Za-z0-9!@$%^&*()-_+' | head -c ${length}
}

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE_PATH="${SCRIPT_DIR}/.env"

# Generate secure passwords
RABBITMQ_PASSWORD=$(generate_secure_password)
DB_PASSWORD=$(generate_secure_password)
JWT_SECRET=$(generate_secure_password 32)
MINIO_PASSWORD=$(generate_secure_password)

# Check if .env file already exists
if [ -f "${ENV_FILE_PATH}" ]; then
  read -p "The .env file already exists. Do you want to overwrite it? (y/n): " OVERWRITE
  if [[ ! "${OVERWRITE}" =~ ^[Yy]$ ]]; then
    echo "Operation cancelled. Existing .env file was not modified."
    exit 0
  fi
fi

# Create .env file content
cat > "${ENV_FILE_PATH}" << EOF
#Copernicus API
CDSAPI_URL="https://cds.climate.copernicus.eu/api"
CDSAPI_KEY="YOUR-CDS-API-KEY"

#RabbitMQ
RABBITMQ_HOST="rabbitmq"
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_DEFAULT_USER="admin"
RABBITMQ_DEFAULT_PASS="${RABBITMQ_PASSWORD}"
RABBITMQ_URL="amqp://admin:${RABBITMQ_PASSWORD}@rabbitmq:5672"
RABBITMQ_CONFIG_QUEUE="config_queue"
RABBITMQ_RESULT_QUEUE="result_queue"
RABBITMQ_PROGRESS_QUEUE="progress_queue"

# Database
DB_HOST="postgres"
DB_PORT=5432
DB_USERNAME="postgres"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="nestjs_auth_db"

# NestJS APP
PORT=3000
NODE_ENV="development"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRATION="1d"

#MINIO
MINIO_BUCKET="generated-files"
MINIO_HOST="minio"
MINIO_PORT=9000
MINIO_ENDPOINT=minio:9000
MINIO_USER="minio_access_key"
MINIO_PASSWORD="${MINIO_PASSWORD}"
EOF

echo "Successfully created .env file at ${ENV_FILE_PATH}"

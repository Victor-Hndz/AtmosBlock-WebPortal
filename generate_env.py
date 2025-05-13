import secrets
import string
from pathlib import Path


def generate_secure_password(length=16):
    """Generate a secure random password."""
    characters = string.ascii_letters + string.digits + "!@$%^&*()-_+"
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_env_file():
    """
    Generates a .env file with all the required values for the first time setup.
    Passwords are auto-generated for extra security.
    """
    script_dir = Path(__file__).parent
    env_file_path = script_dir / ".env"
    
    # Generate secure passwords
    rabbitmq_password = generate_secure_password()
    db_password = generate_secure_password()
    jwt_secret = generate_secure_password(32)
    minio_password = generate_secure_password()
    
    # Define the content for the .env file with auto-generated passwords
    env_content = f'''#Copernicus API
    CDSAPI_URL="https://cds.climate.copernicus.eu/api"
    CDSAPI_KEY="YOUR-CDS-API-KEY"

    #RabbitMQ
    RABBITMQ_HOST="rabbitmq"
    RABBITMQ_PORT=5672
    RABBITMQ_MANAGEMENT_PORT=15672
    RABBITMQ_DEFAULT_USER="admin"
    RABBITMQ_DEFAULT_PASS="{rabbitmq_password}"
    RABBITMQ_URL="amqp://admin:{rabbitmq_password}@rabbitmq:5672"
    RABBITMQ_QUEUE="config_queue"

    # Database
    DB_HOST="postgres"
    DB_PORT=5432
    DB_USERNAME="postgres"
    DB_PASSWORD="{db_password}"
    DB_NAME="nestjs_auth_db"

    # NestJS APP
    PORT=3000
    NODE_ENV="development"

    # JWT
    JWT_SECRET="{jwt_secret}"
    JWT_EXPIRATION="1d"

    #MINIO
    MINIO_ENDPOINT=minio:9000
    MINIO_PORT=9000
    MINIO_USER="minio_access_key"
    MINIO_PASSWORD="{minio_password}"
    MINIO_BUCKET="generated"
    '''
    
    # Check if .env file already exists
    if env_file_path.exists():
        overwrite = input("The .env file already exists. Do you want to overwrite it? (y/n): ").lower()
        if overwrite != 'y':
            print("Operation cancelled. Existing .env file was not modified.")
            return
    
    # Write the content to the .env file
    with open(env_file_path, 'w') as f:
        f.write(env_content)
    
    print(f"Successfully created .env file at {env_file_path}")
    
    
if __name__ == "__main__":
    generate_env_file()

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies and upgrade pip in one layer
RUN apt-get update && \
    apt-get install -y python3-pip && \
    pip install --upgrade pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and install configurator dependencies first to leverage cache
COPY ./configurator/requirements.txt /app/configurator/requirements.txt

# Use BuildKit cache for pip (if enabled)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r configurator/requirements.txt

# Copy configurator code after installing its requirements
COPY ./configurator /app/configurator

# Copy and install utils dependencies
COPY ./utils/requirements.txt /app/utils/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r utils/requirements.txt

# Copy utils code
COPY ./utils /app/utils

# Create necessary directory
RUN mkdir -p /app/config/data

# Build arguments (used only at build time)
ARG CDSAPI_URL
ARG CDSAPI_KEY

# Set environment variables for runtime
ENV CDSAPI_URL=${CDSAPI_URL}
ENV CDSAPI_KEY=${CDSAPI_KEY}

# Configure CDS API access
RUN echo -e "url: ${CDSAPI_URL}\nkey: ${CDSAPI_KEY}" > /root/.cdsapirc

# Default command
CMD ["python", "configurator/configurator_CLI.py"]

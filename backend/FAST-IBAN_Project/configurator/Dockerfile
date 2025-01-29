# Base image with build tools and libraries
FROM python:3.11-slim

# Install Ansible and required tools and update dependencies
RUN apt-get update && \
	apt-get install -y python3-pip \
	&& pip install --upgrade pip && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

RUN mkdir -p /app/config/data

COPY ./configurator /app/configurator

RUN pip install --no-cache-dir -r ./configurator/requirements.txt

# Copy project files to the container
COPY ./utils /app/utils

# Install required Python packages
RUN pip install --no-cache-dir -r ./utils/requirements.txt

# Load environment variables from build arguments
ARG CDSAPI_URL
ARG CDSAPI_KEY

# Export variables as environment variables
ENV CDSAPI_URL=${CDSAPI_URL}
ENV CDSAPI_KEY=${CDSAPI_KEY}

# Set up the CDS API personal access token inside the container
RUN echo "url: $CDSAPI_URL\nkey: $CDSAPI_KEY" > /root/.cdsapirc

# Run the executable
CMD [ "python", "configurator/configurator_CLI.py" ]
# Base image with build tools and libraries
FROM python:3.11-slim

# Install Ansible and required tools and update dependencies
RUN apt-get update && \
	apt-get install -y ansible \
    build-essential \
    libcurl4-openssl-dev \
    libnetcdf-dev \
    m4 \
    python3-pip \
    wget \
	&& pip install --upgrade pip && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

COPY ./configurator /app/configurator

RUN pip install --no-cache-dir -r ./configurator/requirements.txt

# Copy project files to the container
COPY ./utils /app/utils

# Install required Python packages
RUN pip install --no-cache-dir -r ./utils/requirements.txt

# # Copy playbook and related files
# COPY ./execution/install_netcdf.yml /app/install_netcdf.yml

# Run Ansible playbook
# RUN ansible-playbook install_netcdf.yml

# Run the executable
CMD [ "python", "configurator/configurator_CLI.py" ]
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

COPY ./visualization /app/visualization

RUN pip install --no-cache-dir -r ./visualization/requirements.txt

# Copy project files to the container
COPY ./utils /app/utils

# Install required Python packages
RUN pip install --no-cache-dir -r ./utils/requirements.txt

# Run the executable
CMD [ "python", "./visualization/handler/visualization_handler.py" ]
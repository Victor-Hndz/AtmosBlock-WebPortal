FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Install Ansible and required tools and update dependencies
RUN apt-get update && \
	apt-get install -y python3-pip \
	&& pip install --upgrade pip && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

COPY ./visualization/requirements.txt /app/visualization/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
	pip install --no-cache-dir -r ./visualization/requirements.txt

COPY ./visualization /app/visualization

# Copy and install utils dependencies
COPY ./utils/requirements.txt /app/utils/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r utils/requirements.txt

COPY ./utils /app/utils

# Copy the cartopy download script
COPY ./scripts/download_cartopy_shapes.sh /app/download_cartopy_shapes.sh

# Make the script executable and run it to download cartopy shapes
RUN chmod +x /app/download_cartopy_shapes.sh && \
    /bin/bash /app/download_cartopy_shapes.sh

# Run the executable
CMD [ "python", "visualization/handler/visualization_handler.py" ]
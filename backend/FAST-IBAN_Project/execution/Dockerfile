# Base image with build tools and libraries
FROM victorhndz/netcdf-base:latest

# Set up environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Install Ansible and required tools and update dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libcurl4-openssl-dev \
    libnetcdf-dev \
    m4 \
    mpich \
    python3 \
    python3-apt \
    python3-pip \
    wget \
    && pip install --upgrade pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy project files to the container
COPY ./execution/code /app
COPY ./execution/handler /app/handler

# Copy project files to the container
COPY ./utils /app/utils

# Install required Python packages
RUN pip install --no-cache-dir -r ./utils/requirements.txt

# Run the executable
CMD [ "python3", "handler/exec_handler.py" ]

# Run CMake to configure the project and build the project
# RUN cmake . && make

# # Run the executable
# CMD [ "./execution/FAST-IBAN" ]
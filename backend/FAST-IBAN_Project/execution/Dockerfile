# Base image with build tools and libraries
FROM ubuntu:22.04

# Set up environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Install Ansible and required tools and update dependencies
RUN apt-get update && apt-get install -y \
    ansible \
    build-essential \
    cmake \
    git \
    libcurl4-openssl-dev \
    libnetcdf-dev \
    m4 \
    mpich \
    python3 \
    python3-apt \
    wget \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy playbook and related files
COPY ./execution/install_netcdf.yml /app/install_netcdf.yml

# Run Ansible playbook
RUN ansible-playbook install_netcdf.yml

# Copy project files to the container
COPY ./execution/code /app
COPY ./config /app/config

# Run CMake to configure the project and build the project
RUN cmake . && make

# Run the executable
CMD [ "./execution/FAST-IBAN" ]
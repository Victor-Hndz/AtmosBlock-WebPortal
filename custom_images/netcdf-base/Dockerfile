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
    python3-pip \
    wget \
    && pip install --upgrade pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy playbook and related files
COPY /execution/install_netcdf.yaml /app/install_netcdf.yml

# Run Ansible playbook
RUN ansible-playbook install_netcdf.yml

# Set environment variables for NetCDF and HDF5
ENV HDF5_DIR=/usr/local/hdf5-1.14.3
ENV NETCDF4_DIR=/usr/local

# Define default command (can be overridden)
CMD ["/bin/bash"]
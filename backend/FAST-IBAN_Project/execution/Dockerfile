FROM victorhndz/netcdf-base:latest

# Set the working directory inside the container
WORKDIR /app

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

# Copy project files to the container
COPY ./execution/code /app/code
COPY ./execution/code_t /app/code_t
COPY ./execution/handler /app/handler

# Copy and install utils dependencies
COPY ./utils/requirements.txt /app/utils/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r utils/requirements.txt

COPY ./utils /app/utils

# Run the executable
CMD [ "python3", "handler/exec_handler.py" ]

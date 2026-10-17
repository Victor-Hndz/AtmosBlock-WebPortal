# Base image of the C core (CI job c-core and execution/Dockerfile). WEB-363: Ubuntu 26.04 with everything from apt
# (NetCDF 4.9.3, formerly compiled from source with ansible). Not 24.04: its MPICH 4.2.0 is built against PMIx but its
# mpiexec does not speak PMIx, so every rank runs alone ("rank 0 of 1").
FROM ubuntu:26.04@sha256:c098726dd9b9733f3e885f8de0ef375206a311b0a317eadc40d347b1115fb944

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Ubuntu archive snapshot: rebuilding the image installs the same package versions (same gcc, same NetCDF).
# The snapshot server is HTTPS only, so the CA certificates come first, from the live archive.
ARG SNAPSHOT=20261017T000000Z
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && apt-get update --snapshot $SNAPSHOT && apt-get install -y --no-install-recommends --snapshot $SNAPSHOT \
    build-essential \
    cmake \
    git \
    libmpich-dev \
    libnetcdf-dev \
    mpich \
    netcdf-bin \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

CMD ["/bin/bash"]

# Same base as the c-core CI job, pinned by digest (WEB-303; WEB-363: netcdf-base:ubuntu26).
FROM victorhndz/netcdf-base@sha256:6f448a9eda3a12073be2c427d524d984387a85fc408a2f5755b648f59361a429

# Set the working directory inside the container
WORKDIR /app

# Set up environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# No apt-get here: the base already has the build tools, and reinstalling them could update gcc and compile the core
# with a different compiler than CI (WEB-303).

# Copy project files to the container
COPY ./execution/code /app/code
COPY ./execution/code_t /app/code_t

# WEB-303: the core is compiled once, into the image, in the build folders exec_handler.py uses; it is not
# recompiled per request.
RUN cmake -S code -B code/build && cmake --build code/build --parallel \
    && cmake -S code_t -B code_t/build && cmake --build code_t/build --parallel

COPY ./execution/handler /app/handler

# Copy and install utils dependencies
COPY ./utils/requirements.txt /app/utils/requirements.txt
# The system Python is externally managed (PEP 668); this container runs a single application, so pip installs into it.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --break-system-packages -r utils/requirements.txt

COPY ./utils /app/utils

# Run the executable
CMD [ "python3", "handler/exec_handler.py" ]

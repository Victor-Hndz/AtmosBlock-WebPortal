FROM python:3.14-slim

# Set the working directory inside the container
WORKDIR /app

COPY ./handler /app/handler

# Copy and install utils dependencies
COPY ./utils/requirements.txt /app/utils/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r utils/requirements.txt

COPY ./utils /app/utils

# Run the executable
CMD [ "python", "handler/config_handler.py" ]
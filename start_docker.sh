#!/bin/bash

# Read the DEV_MODE from .env file
DEV_MODE=$(grep '^DEV_MODE=' .env | cut -d '=' -f2)

# Remove any surrounding quotes
DEV_MODE=$(echo $DEV_MODE | tr -d '"' | tr -d "'")

# Choose the appropriate docker-compose file
if [ "$DEV_MODE" = "true" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
else
    COMPOSE_FILE="docker-compose.prod.yml"
fi

# Start Docker Compose with the selected file
docker-compose -f $COMPOSE_FILE up -d

echo "Started Docker Compose with $COMPOSE_FILE"
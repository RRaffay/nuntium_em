#!/bin/bash

# Read the APP_ENV from .env file
APP_ENV=$(grep '^APP_ENV=' .env | cut -d '=' -f2)

# Remove any surrounding quotes
APP_ENV=$(echo $APP_ENV | tr -d '"' | tr -d "'")

# Choose the appropriate docker-compose file
if [ "$APP_ENV" = "development" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
elif [ "$APP_ENV" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    echo "Invalid APP_ENV value. Please set it to 'development' or 'production' in .env file."
    exit 1
fi

# Stop Docker Compose with the selected file
docker-compose -f $COMPOSE_FILE down

echo "Stopped Docker Compose with $COMPOSE_FILE"
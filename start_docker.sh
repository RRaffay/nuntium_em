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

# Parse command-line arguments
SERVICES=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend) SERVICES="$SERVICES frontend";;
        --backend) SERVICES="$SERVICES backend";;
        --report) SERVICES="$SERVICES report_server";;
        --news) SERVICES="$SERVICES news_pipeline_server";;
        --chat) SERVICES="$SERVICES research_chat";;
        --datachat) SERVICES="$SERVICES data_chat";;
        --db) SERVICES="$SERVICES mongodb";;
        --redis) SERVICES="$SERVICES redis";;
        --nginx) SERVICES="$SERVICES nginx";;
        --certbot) SERVICES="$SERVICES certbot";;
        *) echo "Unknown option: $1"; exit 1;;
    esac
    shift
done

# Start Docker Compose with the selected file and services
if [ -z "$SERVICES" ]; then
    docker-compose -f $COMPOSE_FILE up -d --build
    echo "Started all services with $COMPOSE_FILE"
else
    docker-compose -f $COMPOSE_FILE up -d --build $SERVICES
    echo "Started selected services: $SERVICES with $COMPOSE_FILE"
fi
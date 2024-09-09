#!/bin/bash

# Ensure you're logged in to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $(echo "$GITHUB_USERNAME" | tr '[:upper:]' '[:lower:]') --password-stdin

# GitHub username or organization (converted to lowercase)
GITHUB_OWNER=$(echo "RRaffay" | tr '[:upper:]' '[:lower:]')

# Array of services to push
services=("frontend" "backend" "report_server" "news_pipeline_server" "research_chat")

# Loop through each service
for service in "${services[@]}"
do
    # Get the image name for the service
    image=$(docker-compose images -q $service)
    
    if [ -n "$image" ]; then
        # Convert service name to lowercase and replace underscores with hyphens
        service_name=$(echo $service | tr '[:upper:]' '[:lower:]' | tr '_' '-')
        
        # Tag the image for GitHub Container Registry
        new_tag="ghcr.io/$GITHUB_OWNER/nuntium-em:$service_name-latest"
        docker tag $image $new_tag
        
        # Push the image
        docker push $new_tag
        
        echo "Pushed $new_tag"
    else
        echo "No image found for service $service"
    fi
done
#!/bin/sh
set -e

# Generate the config file
/app/generate_config.sh

# Debug: Print the contents of the generated file
echo "Generated config file:"
cat /app/config/em-news-gdelt.json

# Run the application
exec poetry run python news_pipeline_server.py
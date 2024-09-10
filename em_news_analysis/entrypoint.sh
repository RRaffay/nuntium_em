#!/bin/sh
set -e

# Generate the config file
/app/generate_config.sh

# Run the application
exec poetry run python news_pipeline_server.py
# Dockerfile for em_news_analysis
FROM python:3.11
WORKDIR /app

# Copy pyproject.toml and install dependencies
COPY pyproject.toml .
RUN pip install poetry
RUN poetry install --no-root

# Copy the rest of the code
COPY . .

# Create a script to generate the JSON file
RUN echo '#!/bin/sh\n\
echo "{\n\
  \"type\": \"service_account\",\n\
  \"project_id\": \"$GOOGLE_PROJECT_ID\",\n\
  \"private_key_id\": \"$GOOGLE_PRIVATE_KEY_ID\",\n\
  \"private_key\": $GOOGLE_PRIVATE_KEY,\n\
  \"client_email\": \"$GOOGLE_CLIENT_EMAIL\",\n\
  \"client_id\": \"$GOOGLE_CLIENT_ID\",\n\
  \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\",\n\
  \"token_uri\": \"https://oauth2.googleapis.com/token\",\n\
  \"auth_provider_x509_cert_url\": \"https://www.googleapis.com/oauth2/v1/certs\",\n\
  \"client_x509_cert_url\": \"https://www.googleapis.com/robot/v1/metadata/x509/em-gdelt-access%40em-news-gdelt.iam.gserviceaccount.com\",\n\
  \"universe_domain\": \"googleapis.com\"\n\
}" > /app/config/em-news-gdelt.json' > /app/generate_config.sh && chmod +x /app/generate_config.sh

# Use an entrypoint script to generate the config and run the application
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
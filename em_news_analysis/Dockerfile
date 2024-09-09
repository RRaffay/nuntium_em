# Dockerfile for em_news_analysis
FROM python:3.11
WORKDIR /app

# Copy pyproject.toml and install dependencies
COPY pyproject.toml .
RUN pip install poetry
RUN poetry install --no-root

# Copy the rest of the code
COPY . .

CMD ["poetry", "run", "python", "news_pipeline_server.py"]
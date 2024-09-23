# Dockerfile for em_data_chat
FROM python:3.11
WORKDIR /app

# Copy pyproject.toml and install dependencies
COPY pyproject.toml .
RUN pip install poetry
RUN poetry install --no-root

COPY . .

CMD ["poetry", "run", "python", "data_chat_server.py"]
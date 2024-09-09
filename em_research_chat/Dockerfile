# Dockerfile for em_research_chat
FROM python:3.11
WORKDIR /app

# Copy pyproject.toml and install dependencies
COPY pyproject.toml .
RUN pip install poetry
RUN poetry install --no-root

COPY . .

CMD ["poetry", "run", "python", "chat_server.py"]
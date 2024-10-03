# Nuntium Research Chatbot

Nuntium Research Chatbot is an Emerging Markets News Agentic Research tool designed to assist with equity research and analysis.

## Features

- Generates equity reports based on recent events
- Utilizes advanced language models for research planning and content generation
- Integrates with Tavily for web search and article summarization
- Provides a FastAPI server for easy integration

## Installation

1. Ensure you have Python 3.9 or later installed.
2. Clone this repository.
3. Install dependencies using Poetry:

```bash
poetry install
```

## Usage

### Running the Chat Server

To start the FastAPI server:

```bash
poetry run python chat_server.py
```

The server will be available at `http://0.0.0.0:8003`.

### Using the Research Chat

You can use the `run_research_chat.py` script to generate equity reports:

```bash
poetry run python run_research_chat.py
```

## Configuration

- Set up your environment variables in a `.env` file.
- Ensure you have API keys for OpenAI, Anthropic, and Tavily.

## Docker

A Dockerfile is provided for containerization. To build and run:

```bash
docker build -t em_data_chat .
docker run -p 8003:8003 em_data_chat
```

## Project Structure

- `em_data_chat/`: Main package directory
  - `agent.py`: Defines the research chat graph
  - `utils/`: Utility functions and classes
    - `nodes.py`: Node functions for the graph
    - `prompts.py`: Prompt templates
    - `tools.py`: External API integrations
    - `article_summarizer.py`: Article summarization logic
- `chat_server.py`: FastAPI server
- `run_research_chat.py`: Script to run the research chat

## Dependencies

Key dependencies include:
- langgraph
- langchain
- fastapi
- tavily-python
- beautifulsoup4

For a full list of dependencies, refer to the `pyproject.toml` file.

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.


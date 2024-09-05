# Nuntium News Agentic Research

This project provides an AI-powered tool for generating equity reports and economic analyses focused on Emerging Markets.

## Features

- Automated research and report generation
- Multi-step process including planning, research, writing, and revision
- Integration with Tavily API for web search
- FastAPI server for easy deployment and API access

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   poetry install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```
   TAVILY_API_KEY=your_tavily_api_key
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

## Usage

### Running the FastAPI server

```
poetry run python report_server.py
```

The server will start on `http://0.0.0.0:8001`.

### API Endpoints

1. `/run_graph`: Generate a report based on a given task
2. `/economic_report`: Generate an economic report for a specific country

Refer to the `report_server.py` file for detailed input schemas.

### Docker

To run the project using Docker:

1. Build the Docker image:
   ```
   docker build -t em_research_agentic .
   ```
2. Run the container:
   ```
   docker run -p 8001:8001 em_research_agentic
   ```

## Project Structure

- `em_research_agentic/`: Main package directory
  - `agent.py`: Defines the LangGraph for the research process
  - `utils/`: Utility functions and classes
    - `nodes.py`: Individual nodes for the LangGraph
    - `prompts.py`: Prompt templates for various stages
    - `state.py`: State management for the agent
    - `tools.py`: External tool integrations (e.g., Tavily)
    - `article_summarizer.py`: Functions for summarizing web articles
- `run_research.py`: Script for running the research process
- `report_server.py`: FastAPI server for API access

## Dependencies

This project uses Poetry for dependency management. Key dependencies include:

- langgraph
- langchain
- fastapi
- tavily-python
- beautifulsoup4

For a complete list of dependencies, refer to the `pyproject.toml` file.

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.
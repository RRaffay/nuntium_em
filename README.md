# Nuntium EM Research

## Overview

Nuntium EM Research is a comprehensive platform for analyzing and reporting on emerging markets news. The project integrates various tools and libraries to fetch, process, and analyze news data, providing valuable insights for investors and researchers.

## Components

1. **News Analysis Pipeline**: Core engine for processing GDELT data and generating insights.
2. **Backend API**: FastAPI server providing endpoints for data retrieval and report generation.
3. **Frontend**: React-based user interface for interacting with the system.
4. **Agentic Research**: AI-powered tool for generating equity reports and economic analyses.
5. **Research Chatbot**: Interactive chat interface for equity research and analysis.

## Features

- Data fetching from GDELT and other sources
- Advanced data preprocessing and analysis
- Embedding generation and clustering of articles
- Automated report generation for countries and specific events
- User authentication and profile management
- Interactive dashboard with country information
- AI-powered research planning and content generation
- Web search integration for up-to-date information

## Installation

### Prerequisites

- Python 3.11+
- Node.js 14+
- Poetry
- Docker (optional)

### Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/RRaffay/nuntium-em-research
   cd nuntium-em-research
   ```

2. Set up environment variables:
   Create a `.env` file in the project root with the following:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=[path-to-your-google-credentials-file]
   OPENAI_API_KEY=[your-openai-api-key]
   ANTHROPIC_API_KEY=[your-anthropic-api-key]
   TAVILY_API_KEY=[your-tavily-api-key]
   USER_AGENT=NuntiumEMResearch/1.0
   MONGO_URI=[your-mongodb-connection-string]
   ```

3. Install dependencies for each component (refer to individual README files for detailed instructions).

## Usage

### Running Components

- **News Analysis Pipeline**: `poetry run python run_pipeline.py`
- **Backend API**: `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Frontend**: `npm start` (in the frontend directory)
- **Agentic Research Server**: `poetry run python report_server.py`
- **Research Chatbot**: `poetry run python chat_server.py`

### Docker

Docker configurations are available for each component. Use `docker-compose` to run the entire system:

```sh
docker-compose up --build
```

## API Endpoints

- `/countries`: List available countries
- `/countries/{country}`: Get data for a specific country
- `/countries/{country}/generate-report`: Generate an economic report
- `/auth/*`: User authentication endpoints
- `/run_graph`: Generate a report based on a given task (Agentic Research)
- `/economic_report`: Generate an economic report for a specific country (Agentic Research)

Refer to individual component README files for more detailed API documentation.

## Project Structure

- `em_news_analysis/`: News analysis pipeline
- `backend/`: FastAPI backend server
- `frontend/`: React frontend application
- `em_research_agentic/`: AI-powered research tool
- `em_research_chat/`: Research chatbot

## Configuration

Each component has its own configuration options. Refer to individual README files for component-specific settings.

## Dependencies

Key dependencies include:
- pandas
- scikit-learn
- openai
- google-cloud-bigquery
- langchain
- fastapi
- react
- langgraph
- tavily-python

For a complete list, refer to `pyproject.toml` and `package.json` files in each component.

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

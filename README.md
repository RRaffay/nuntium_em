# Nuntium EM Research

## Overview

Nuntium EM Research is a comprehensive platform for analyzing and reporting on emerging markets news. The project integrates various tools and libraries to fetch, process, and analyze news data, providing valuable insights for investors and researchers.

## Features

- **Data Fetching**: Retrieves data from GDELT and other sources.
- **Data Preprocessing**: Cleans and prepares raw data for analysis.
- **Embedding Generation**: Creates embeddings for articles using OpenAI's API.
- **Clustering**: Groups similar articles using HDBSCAN clustering.
- **Cluster Matching**: Matches clusters to the input query using cosine similarity.
- **Article Sampling**: Selects representative articles from matched clusters.
- **Summarization**: Generates summaries for sampled articles and clusters.

## Project Structure

- **frontend**: Contains the React frontend application.
- **backend**: Contains the FastAPI backend application.
- **em_news_analysis**: Contains the core news analysis pipeline.
- **em_research_agentic**: Contains tools for agentic research and analysis.

## Installation

### Prerequisites

- Node.js
- Python 3.11
- Poetry

### Steps

1. Clone the repository:
    ```sh
    git clone https://github.com/RRaffay/nuntium-em-research
    cd nuntium-em-research
    ```

2. Install backend dependencies:
    ```sh
    cd backend
    poetry install
    ```

3. Install frontend dependencies:
    ```sh
    cd ../frontend
    npm install
    ```

4. Set up environment variables:
    - Create a `.env` file in the project root.
    - Add the following variables:
        ```sh
        GOOGLE_APPLICATION_CREDENTIALS=[path-to-your-google-credentials-file]
        OPENAI_API_KEY=[your-openai-api-key]
        USER_AGENT=NuntiumEMResearch/1.0
        ```

## Usage

### Running the Backend

1. Navigate to the backend directory:
    ```sh
    cd backend
    ```

2. Start the FastAPI server:
    ```sh
    poetry run uvicorn backend.app.main:app --reload
    ```

### Running the Frontend

1. Navigate to the frontend directory:
    ```sh
    cd ../frontend
    ```

2. Start the React application:
    ```sh
    npm start
    ```

### Running with Docker

1. Build and start the services using Docker Compose:
    ```sh
    docker-compose up --build
    ```

## API Endpoints

### Get Countries

- **URL**: `/countries`
- **Method**: `GET`
- **Description**: Retrieves a list of available countries.

### Get Country Events

- **URL**: `/countries/{country}/events`
- **Method**: `GET`
- **Description**: Retrieves events for a specified country.

### Generate Report

- **URL**: `/countries/{country}/generate-report`
- **Method**: `POST`
- **Description**: Generates a report for a specified country.

## Configuration

The `Config` class in `em_news_analysis/config.py` allows customization of various parameters of the pipeline, including:

- Embedding model
- Clustering parameters
- Cache settings
- Maximum articles per cluster

## Output

The pipeline generates two types of output:

1. **CSV file**: Contains processed GDELT data.
2. **JSON file**: Includes cluster summaries and individual article summaries.

These files are saved in the `exported_data` directory.

## Dependencies

Key dependencies include:

- pandas
- scikit-learn
- openai
- google-cloud-bigquery
- langchain

For a complete list, refer to the `pyproject.toml` file.

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
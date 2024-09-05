# Nuntium News Analysis Pipeline

## Overview

This project implements a sophisticated news analysis pipeline using GDELT (Global Database of Events, Language, and Tone) data. It fetches, processes, and analyzes news articles to provide summarized insights based on user-specified parameters.

## Features

1. **Data Fetching**: Retrieves GDELT data for a specified country and time range.
2. **Data Preprocessing**: Cleans and prepares raw data for analysis.
3. **Embedding Generation**: Creates embeddings for sampled articles using OpenAI's API.
4. **Clustering**: Groups similar articles using HDBSCAN clustering.
5. **Cluster Matching**: Matches clusters to the input query using cosine similarity.
6. **Article Sampling**: Selects representative articles from matched clusters.
7. **Summarization**: Generates summaries for sampled articles and clusters.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/RRaffay/em_news_analysis
   ```

2. Install dependencies using Poetry:
   ```
   poetry install
   ```

3. Set up environment variables:
   - Create a `.env` file in the project root.
   - Add the following variables:
     ```
     GOOGLE_APPLICATION_CREDENTIALS=[path-to-your-google-credentials-file]
     OPENAI_API_KEY=[your-openai-api-key]
     USER_AGENT=EMNewsAnalysis/1.0
     MONGO_URI=[your-mongodb-connection-string]
     ```

## Usage

### Running the Pipeline

You can run the pipeline using the following command:

```
poetry run python run_pipeline.py
```

This script demonstrates how to use the `GDELTNewsPipeline` class with sample parameters.

### API Server

The project includes a FastAPI server for running the pipeline. To start the server:

```
poetry run python news_pipeline_server.py
```

The server will be available at `http://localhost:8002`. You can use the `/run_pipeline` endpoint to trigger the analysis.

## Configuration

The `Config` class in `em_news_analysis/config.py` allows you to customize various parameters of the pipeline, including:

- Embedding model
- Clustering parameters
- Cache settings
- Maximum articles per cluster

## Output

The pipeline generates two types of output:

1. CSV file: Contains processed GDELT data.
2. JSON file: Includes cluster summaries and individual article summaries.

These files are saved in the `exported_data` directory by default.

## Docker Support

The project includes a Dockerfile for containerization. To build and run the Docker image:

```
docker build -t em_news_analysis .
docker run -p 8002:8002 em_news_analysis
```

## Dependencies

Key dependencies include:
- pandas
- scikit-learn
- openai
- google-cloud-bigquery
- langchain
- fastapi
- pymongo

For a complete list, refer to the `pyproject.toml` file.

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

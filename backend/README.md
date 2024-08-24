# Nuntium API Backend

This is the backend for the Nuntium API, built with FastAPI. It provides endpoints to fetch country-specific economic data and generate economic reports based on recent events.

## Features

- **CORS Support**: Configured to allow requests from `http://localhost:3000`.
- **Data Models**: Defines models for `ArticleInfo`, `Event`, `CountryData`, and `Report`.
- **Data Loading**: Loads country-specific event data from JSON files.
- **API Endpoints**: Provides endpoints to fetch country data and generate economic reports.

## Requirements

- Python 3.11
- Poetry for dependency management

## Setup

1. **Clone the repository**:
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Install dependencies**:
    ```sh
    poetry install
    ```

3. **Run the application**:
    ```sh
    uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
    ```

## Docker Setup

1. **Build the Docker image**:
    ```sh
    docker build -t em-investor-api .
    ```

2. **Run the Docker container**:
    ```sh
    docker run -p 8000:8000 em-investor-api
    ```

## Environment Variables

Ensure you have a `.env` file in the root directory with the necessary environment variables. The application uses `python-dotenv` to load these variables.

## API Endpoints

### Root

- **GET /**: Returns a welcome message.
    ```python:backend/app/main.py
    startLine: 68
    endLine: 70
    ```

### Countries

- **GET /countries**: Returns a list of available countries.
    ```python:backend/app/main.py
    startLine: 73
    endLine: 75
    ```

- **GET /countries/{country}**: Returns data for a specific country.
    ```python:backend/app/main.py
    startLine: 78
    endLine: 82
    ```

### Reports

- **POST /countries/{country}/generate-report**: Generates an economic report for a specific country.
    ```python:backend/app/main.py
    startLine: 107
    endLine: 126
    ```

## Data Loading

The application loads country-specific event data from JSON files located in the `em_news_analysis/exported_data` directory.
    ```python:backend/app/main.py
    startLine: 43
    endLine: 63
    ```

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.
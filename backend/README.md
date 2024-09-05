# Nuntium API Backend

This is the backend for the Nuntium API, built with FastAPI. It provides endpoints to fetch country-specific economic data, generate economic reports based on recent events, and handle user authentication.

## Features

- **CORS Support**: Configured to allow requests from specified origins.
- **Data Models**: Defines models for `ArticleInfo`, `Event`, `CountryData`, `Report`, and `User`.
- **Data Loading**: Loads country-specific event data from MongoDB.
- **API Endpoints**: Provides endpoints to fetch country data, generate economic reports, and handle user authentication.
- **Authentication**: Uses FastAPI Users for JWT-based authentication.
- **Caching**: Implements Redis-based caching for improved performance.

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

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the necessary environment variables. The application uses `python-dotenv` to load these variables.

4. **Run the application**:
    ```sh
    uvicorn app.main:app --host 0.0.0.0 --port 8000
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

## API Endpoints

### Authentication

- **POST /auth/jwt/login**: Log in a user
- **POST /auth/register**: Register a new user
- **GET /auth/jwt/logout**: Log out a user
- **GET /user/profile**: Get user profile
- **PUT /user/profile**: Update user profile

### Countries

- **GET /countries**: Returns a list of available countries.
- **GET /countries/{country}**: Returns data for a specific country.

### Reports

- **POST /countries/{country}/generate-report**: Generates an economic report for a specific country.
- **POST /countries/{country}/events/{event_id}/generate-report**: Generates an economic report for a specific event in a country.

## Project Structure

The backend is organized into several modules:

- `app/main.py`: The main FastAPI application
- `app/models`: Data models
- `app/auth`: Authentication-related modules
- `app/db`: Database operations
- `app/cache`: Caching setup
- `app/config.py`: Configuration settings

## License

This project is licensed under the MIT License (Non-Commercial Use). See the LICENSE file for details.
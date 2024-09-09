.PHONY: start_report_server start_news_pipeline_server start_backend start_frontend start_docker_app stop_docker_app start_app

# Target to start the Report server
start_report_server:
	poetry run python em_research_agentic/report_server.py

# Target to start the news pipeline server
start_news_pipeline_server:
	poetry run python em_news_analysis/news_pipeline_server.py

# Target to start the backend
start_backend:
	poetry run python backend/app/main.py

# Target to start the frontend
start_frontend:
	cd frontend && npm start 

# Start all services in docker containers based on DEV_MODE
start_app:
	./start_docker.sh

# Start all services in docker containers (deprecated, use start_app instead)
start_docker_app:
	docker compose up --build -d

# Stop all services in docker containers
stop_docker_app:
	docker compose down
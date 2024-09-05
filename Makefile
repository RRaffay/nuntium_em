.PHONY:

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

# Start all services in docker containers
start_docker_app:
	docker compose up --build -d

# Stop all services in docker containers
stop_docker_app:
	docker compose down
.PHONY: start_report_server start_news_pipeline_server start_backend start_frontend start_app stop_app

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

# Start all services in docker containers based on APP_ENV
start_app:
	./start_docker.sh

# Stop all services in docker containers based on APP_ENV
stop_app:
	./stop_docker.sh

prod_logs:
	docker compose -f docker-compose.prod.yml logs -f frontend nginx
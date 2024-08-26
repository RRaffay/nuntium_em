.PHONY: start_graph_server start_backend start_frontend

# Target to start the Graph server
start_graph_server:
	poetry run python em_research_agentic/graph_server.py

# Target to start the backend
start_backend:
	poetry run python backend/app/main.py

# Target to start the frontend
start_frontend:
	cd frontend && npm start 
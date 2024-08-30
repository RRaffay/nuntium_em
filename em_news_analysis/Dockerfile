FROM python:3.11
WORKDIR /app
COPY em_research_agentic/ ./em_research_agentic/
COPY em_news_analysis/ ./em_news_analysis/
COPY pyproject.toml .
RUN pip install poetry
RUN poetry install 
CMD ["poetry", "run", "python", "em_news_analysis/news_pipeline_server.py"]
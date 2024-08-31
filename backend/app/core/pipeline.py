import httpx
from datetime import datetime
from fastapi import HTTPException
import os
import logging
from pydantic import BaseModel, Field
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CountryPipelineInputApp(BaseModel):
    country: str
    country_alpha2_code: str = Field(default="")
    hours: int = Field(ge=2, le=24, default=3)


class PipelineInputServer(BaseModel):
    input_sentence: str = Field(
        default="Political Changes")
    country: str
    hours: int
    article_summarizer_objective: str = Field(
        default="")
    cluster_summarizer_objective: str = Field(
        default="Below are article summaries for a particular event")
    process_all: bool = False
    sample_size: int = 1500
    max_workers: int = 10


async def run_pipeline(pipeline_inputs: PipelineInputServer):
    """
    Run the news pipeline for processing country data.

    Args:
        pipeline_inputs (PipelineInputServer): The input parameters for the pipeline.

    Returns:
        dict: The result of the pipeline execution.

    Raises:
        HTTPException: If there's an error communicating with the news pipeline server or during execution.
    """
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            news_pipeline_server_url = os.environ.get(
                'NEWS_PIPELINE_SERVER_URL', 'http://0.0.0.0:8002')
            logger.info(
                f"News pipeline server URL: {news_pipeline_server_url}")

            logger.info(pipeline_inputs.model_dump())

            response = await client.post(
                f"{news_pipeline_server_url}/run_pipeline",
                json=pipeline_inputs.model_dump()
            )
            response.raise_for_status()

            result = response.json()
            logger.info("Pipeline execution completed successfully")
            return result
        except httpx.HTTPStatusError as e:
            logger.error(f"Graph server error: {e}")
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

import httpx
from datetime import datetime
from fastapi import HTTPException
import os
import logging
from pydantic import BaseModel, Field
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CountryPipelineRequest(BaseModel):
    country: str
    country_fips_10_4_code: str = Field(default="")
    hours: int = Field(ge=2, le=24, default=3)


class CountryPipelineInputApp(BaseModel):
    country: str
    country_fips_10_4_code: str = Field(default="")
    hours: int = Field(ge=2, le=24, default=3)
    user_id: str


class PipelineInput(BaseModel):
    input_sentence: str = Field(
        default="Political Changes")
    country: str
    country_fips_10_4_code: str
    hours: int
    article_summarizer_objective: str = Field(
        default="")
    cluster_summarizer_objective: str = Field(
        default="")
    process_all: bool = False
    sample_size: int = 1500
    max_workers: int = 10
    user_id: str


async def run_pipeline(pipeline_inputs: CountryPipelineInputApp):
    """
    Run the news pipeline for processing country data.

    Args:
        pipeline_inputs (CountryPipelineInputApp): The input parameters for the pipeline.

    Returns:
        dict: The result of the pipeline execution.

    Raises:
        HTTPException: If there's an error communicating with the news pipeline server or during execution.
    """
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            news_pipeline_server_url = settings.NEWS_PIPELINE_SERVER_URL
            logger.info(
                f"News pipeline server URL: {news_pipeline_server_url}")

            logger.info(
                f"These are the inputs for pipeline from user: {pipeline_inputs}")

            pipeline_inputs

            pipeline_input = PipelineInput(
                country=pipeline_inputs.country,
                country_fips_10_4_code=pipeline_inputs.country_fips_10_4_code,
                hours=pipeline_inputs.hours,
                user_id=pipeline_inputs.user_id
            )

            pipeline_input.cluster_summarizer_objective = f"Analyze for someone interested in events about {pipeline_inputs.country}"

            logger.info(f"These are the inputs for pipeline: {pipeline_input}")

            response = await client.post(
                f"{news_pipeline_server_url}/run_pipeline",
                json=pipeline_input.model_dump()
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

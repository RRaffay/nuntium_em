import httpx
from datetime import datetime
from fastapi import HTTPException
import os
import logging
from pydantic import BaseModel, Field
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PipelineInput(BaseModel):
    country: str
    country_fips_10_4_code: str
    hours: int = Field(ge=2, le=24, default=3)
    user_id: str
    input_sentence: str = Field(default="Economy Finance Markets")
    article_summarizer_objective: str = Field(default="")
    cluster_summarizer_objective: str = Field(default="")
    process_all: bool = False
    sample_size: int = 1500
    max_workers_embeddings: int = 5
    max_workers_summaries: int = 3
    user_area_of_interest: str = Field(default="")

    def generate_payload(self):
        """
        Generate the payload for the pipeline request and log relevant information.

        Returns:
            dict: The payload for the pipeline request.
        """

        self.cluster_summarizer_objective = f"Analyze for someone interested in events about {self.country}. "
        if self.user_area_of_interest:
            self.cluster_summarizer_objective += f"Specifically, focusing on {self.user_area_of_interest}."

        self.article_summarizer_objective = f"Analyze for someone interested in events about {self.country}. "

        self.input_sentence = f"Event about {self.country}. "
        if self.user_area_of_interest:
            self.input_sentence += f"Specifically, focusing on {self.user_area_of_interest}."

        payload = {
            "country": self.country,
            "country_fips_10_4_code": self.country_fips_10_4_code,
            "hours": self.hours,
            "user_id": self.user_id,
            "input_sentence": self.input_sentence,
            "article_summarizer_objective": self.article_summarizer_objective,
            "cluster_summarizer_objective": self.cluster_summarizer_objective,
            "process_all": self.process_all,
            "sample_size": self.sample_size,
            "max_workers_embeddings": self.max_workers_embeddings,
            "max_workers_summaries": self.max_workers_summaries,
            "user_area_of_interest": self.user_area_of_interest
        }

        logger.info(f"These are the inputs for pipeline: {payload}")

        return payload


async def run_pipeline(pipeline_input: PipelineInput):
    """
    Run the news pipeline for processing country data.

    Args:
        pipeline_input (PipelineInput): The input parameters for the pipeline.

    Returns:
        dict: The result of the pipeline execution.

    Raises:
        HTTPException: If there's an error communicating with the news pipeline server or during execution.
    """
    async with httpx.AsyncClient(timeout=450.0) as client:
        try:
            news_pipeline_server_url = settings.NEWS_PIPELINE_SERVER_URL
            logger.info(
                f"News pipeline server URL: {news_pipeline_server_url}")

            payload = pipeline_input.generate_payload()

            response = await client.post(
                f"{news_pipeline_server_url}/run_pipeline",
                json=payload
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

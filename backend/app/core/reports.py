import httpx
from datetime import datetime
from models import Event
from fastapi import HTTPException
import os
import logging
from functools import wraps
import time
from config import settings
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


MAX_REVISIONS_REPORT = settings.MAX_REVISIONS_REPORT
REVISION_NUMBER_REPORT = settings.REVISION_NUMBER_REPORT
EVENT_REPORT_TIMEOUT = settings.EVENT_REPORT_TIMEOUT
COUNTRY_REPORT_TIMEOUT = settings.COUNTRY_REPORT_TIMEOUT
REPORT_CACHE_TIMEOUT = settings.REPORT_CACHE_TIMEOUT
DEBUG = settings.DEBUG

# TODO: Fix the cache to use redis and not the local cache


def async_timed_lru_cache(maxsize=128, expires_after=3600, key_func=None):
    def decorator(func):
        cache = {}

        @wraps(func)
        async def wrapper(*args, **kwargs):
            if key_func:
                key = key_func(*args, **kwargs)
            else:
                key = str(args) + str(kwargs)

            current_time = time.time()
            if key in cache:
                result, timestamp = cache[key]
                if current_time - timestamp < expires_after:
                    return result
                else:
                    del cache[key]
            result = await func(*args, **kwargs)
            cache[key] = (result, current_time)
            if len(cache) > maxsize:
                oldest_key = min(cache, key=lambda k: cache[k][1])
                del cache[oldest_key]
            return result
        return wrapper
    return decorator


# New Pydantic models
class EventReportInput(BaseModel):
    country: str
    area_of_interest: str
    event: Event
    max_revisions: Optional[int] = MAX_REVISIONS_REPORT
    revision_number: Optional[int] = REVISION_NUMBER_REPORT
    debug: Optional[bool] = DEBUG

    def generate_task(self) -> str:
        return f"""<Event>
{self.event.event_summary}
</Event>

<Task>
Write a report detailing all major market movements caused by this event, and any investment opportunities that arise as a result.
Note that we are specifically interested in:
Country: {self.country}
Area of interest: {self.area_of_interest}
Research the background of each investment and create comprehensive explanations justifying these investments.
Ensure the event is likely to have a material effect on all investment opportunities mentioned.
The current date is {datetime.now().strftime('%Y-%m-%d')}.
</Task>"""

    def generate_payload(self) -> dict:
        payload = {
            "task": self.generate_task(),
            "max_revisions": self.max_revisions,
            "revision_number": self.revision_number,
            "debug": self.debug,
        }
        logger.info(f"This is the payload {payload}")
        return payload


class CountryReportInput(BaseModel):
    country: str
    area_of_interest: str
    max_revisions: Optional[int] = MAX_REVISIONS_REPORT
    revision_number: Optional[int] = REVISION_NUMBER_REPORT
    debug: Optional[bool] = DEBUG

    def generate_task(self) -> str:
        return f"""<Task>
Write a report that outlines lucrative financial investments for an emerging market investor for {self.country}.
Note that the investor is specifically interested in {self.area_of_interest}.
Research the background of each investment and create comprehensive explanations justifying these investments.
Avoid general superficial claims and ensure each highlighted investment is analyzed in depth.
The current date is {datetime.now().strftime('%Y-%m-%d')}.
</Task>"""

    def generate_payload(self) -> dict:
        payload = {
            "country": self.country,
            "task": self.generate_task(),
            "max_revisions": self.max_revisions,
            "revision_number": self.revision_number,
            "debug": self.debug,
        }
        logger.info(f"This is the payload {payload}")
        return payload


class ClarifyingQuestionsInput(BaseModel):
    task: str


class OpenResearchReportInput(BaseModel):
    country: str
    task: str
    clarifications: str
    max_revisions: Optional[int] = MAX_REVISIONS_REPORT
    revision_number: Optional[int] = REVISION_NUMBER_REPORT
    debug: Optional[bool] = DEBUG

    def generate_task(self) -> str:
        return f"I'm interested in the following country: {self.country}. More specifically, {self.task}"

    def generate_payload(self) -> dict:
        payload = {
            "task": self.generate_task(),
            "clarifications": self.clarifications,
            "max_revisions": self.max_revisions,
            "revision_number": self.revision_number,
            "debug": self.debug,
        }
        logger.info(f"This is the payload {payload}")
        return payload


@async_timed_lru_cache(maxsize=100, expires_after=REPORT_CACHE_TIMEOUT, key_func=lambda input: f"{input.country}:{input.area_of_interest}:{input.event.id}")
async def economic_report_event(input: EventReportInput):
    async with httpx.AsyncClient(timeout=EVENT_REPORT_TIMEOUT) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/run_report_generation",
                json=input.generate_payload()
            )
            response.raise_for_status()
            result = response.json()

            content = result['final_report']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")


@async_timed_lru_cache(maxsize=100, expires_after=REPORT_CACHE_TIMEOUT, key_func=lambda input: f"{input.country}:{input.area_of_interest}")
async def economic_report(input: CountryReportInput):
    async with httpx.AsyncClient(timeout=COUNTRY_REPORT_TIMEOUT) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/economic_report",
                json=input.generate_payload()
            )
            response.raise_for_status()
            result = response.json()

            content = result['final_report']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")


# @async_timed_lru_cache(maxsize=100, expires_after=REPORT_CACHE_TIMEOUT, key_func=lambda input: input.task)
async def generate_clarifying_questions(input: ClarifyingQuestionsInput):
    async with httpx.AsyncClient(timeout=EVENT_REPORT_TIMEOUT) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            response = await client.post(
                f"{report_server_url}/generate_clarifying_questions",
                json={"task": input.task}
            )
            response.raise_for_status()
            result = response.json()

            # Get the clarifying questions from the response
            clarifying_questions = result.get('clarifying_questions')

            # Remove "Questions" from the clarifying questions
            clarifying_questions = clarifying_questions.replace(
                "Questions:", "").strip()

            return clarifying_questions
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")


@async_timed_lru_cache(maxsize=100, expires_after=REPORT_CACHE_TIMEOUT, key_func=lambda input: f"{input.task}:{input.clarifications}")
async def open_research_report(input: OpenResearchReportInput):
    async with httpx.AsyncClient(timeout=EVENT_REPORT_TIMEOUT) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            response = await client.post(
                f"{report_server_url}/open_research_report",
                json=input.generate_payload()
            )
            response.raise_for_status()
            result = response.json()

            content = result['final_report']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

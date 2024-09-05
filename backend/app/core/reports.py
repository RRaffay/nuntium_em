import httpx
from datetime import datetime
from models import Event
from fastapi import HTTPException
import os
import logging
from functools import wraps
import time
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


@async_timed_lru_cache(maxsize=100, expires_after=300, key_func=lambda country, area_of_interest, event, *args, **kwargs: f"{country}:{area_of_interest}:{event.id}")
async def economic_report_event(country: str, area_of_interest: str, event: Event, max_revisions: int = 3, revision_number: int = 1):

    async with httpx.AsyncClient(timeout=280.0) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/run_graph",
                json={
                    "task": f"<Event>\n{event.event_summary}\n</Event>. \n\n <Task> Write a report that outlines lucrative financial investments for an emerging market investor based on the above event. Note that the investor is specifically interested in country: {country} and area of interest: {area_of_interest}. \n Research the background of each investment and create comprehensive explanations justifying these investments. \n Avoid general superficial claims and ensure each highlighted investment is analyzed in depth. \n The current date is {datetime.now().strftime('%Y-%m-%d')}\n.</Task> ",
                    "max_revisions": max_revisions,
                    "revision_number": revision_number,
                }
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


@async_timed_lru_cache(maxsize=100, expires_after=300, key_func=lambda country, area_of_interest, *args, **kwargs: f"{country}:{area_of_interest}")
async def economic_report(country: str, area_of_interest: str, max_revisions: int = 3, revision_number: int = 1):
    async with httpx.AsyncClient(timeout=210.0) as client:
        try:
            report_server_url = settings.REPORT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/economic_report",
                json={
                    "country": country,
                    "task": f"<Task> Write a report that outlines lucrative financial investments for an emerging market investor for {country}. Note that the investor is specifically interested in {area_of_interest}. \n Research the background of each investment and create comprehensive explanations justifying these investments. \n Avoid general superficial claims and ensure each highlighted investment is analyzed in depth. \n The current date is {datetime.now().strftime('%Y-%m-%d')}\n.</Task> ",
                    "max_revisions": max_revisions,
                    "revision_number": revision_number,
                }
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

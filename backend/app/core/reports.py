import httpx
from datetime import datetime
from models import Event
from fastapi import HTTPException
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def economic_report_event(country: str, area_of_interest: str,  event: Event, max_revisions: int = 3, revision_number: int = 1):
    async with httpx.AsyncClient(timeout=280.0) as client:
        try:
            report_server_url = os.environ.get(
                'REPORT_SERVER_URL', 'http://0.0.0.0:8001')
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

            content = result['draft']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")


async def economic_report(country: str, area_of_interest: str, max_revisions: int = 3, revision_number: int = 1):
    async with httpx.AsyncClient(timeout=210.0) as client:
        try:
            report_server_url = os.environ.get(
                'REPORT_SERVER_URL', 'http://0.0.0.0:8001')
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

            content = result['draft']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

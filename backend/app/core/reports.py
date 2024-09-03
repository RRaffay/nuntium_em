import httpx
from datetime import datetime
from models import Event
from fastapi import HTTPException
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def economic_report_event(country: str, event: Event):
    async with httpx.AsyncClient(timeout=240.0) as client:
        try:
            report_server_url = os.environ.get(
                'REPORT_SERVER_URL', 'http://0.0.0.0:8001')
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/run_graph",
                json={
                    "task": f"<Event>\n{event.event_summary}\n</Event>. \n\n <Task> Write a report that outlines lucrative financial investments for an emerging market investor in the equities markets based on the above event. \n Research the background of each investment and create comprehensive explanations justifying these investments. \n Avoid general superficial claims and ensure each highlighted investment is analyzed in depth. \n The current date is {datetime.now().strftime('%Y-%m-%d')}\n.</Task> ",
                    "max_revisions": 4,
                    "revision_number": 1,
                }
            )
            response.raise_for_status()
            result = response.json()

            content = f"# Economic Report for: {event.title}\n\n"
            content += result['draft']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")


async def economic_report(country: str):
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            report_server_url = os.environ.get(
                'REPORT_SERVER_URL', 'http://0.0.0.0:8001')
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/economic_report",
                json={
                    "country": country,
                }
            )
            response.raise_for_status()
            result = response.json()

            content = f"# Economic Report for: {country}\n\n"
            content += result['draft']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

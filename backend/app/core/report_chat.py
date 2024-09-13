import httpx
from datetime import datetime
from models import Event
from fastapi import HTTPException
import os
import logging
from pydantic import BaseModel
from config import settings
from typing import List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str
    encodedReport: str
    messages: List[Tuple[str, str]] = []  # List of (content, sender) tuples


async def economic_report_chat(question: str, equity_report: str, messages: List[Tuple[str, str]]):
    async with httpx.AsyncClient(timeout=330.0) as client:
        try:
            report_server_url = settings.REPORT_CHAT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/run_research_chat",
                json={
                    "task": question,
                    "equity_report": equity_report,
                    "messages": messages,
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

import httpx
from fastapi import HTTPException
import logging
from pydantic import BaseModel
from config import settings
from typing import List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REPORT_CHAT_TIMEOUT = settings.REPORT_CHAT_TIMEOUT


class ChatRequest(BaseModel):
    message: str
    encodedReport: str
    messages: List[Tuple[str, str]] = []  # List of (content, sender) tuples
    debug: bool = settings.DEBUG

    def generate_payload(self) -> dict:
        return {
            "task": self.message,
            "equity_report": self.encodedReport,
            "messages": self.messages,
        }


async def economic_report_chat(input: ChatRequest):
    async with httpx.AsyncClient(timeout=REPORT_CHAT_TIMEOUT) as client:
        try:
            report_server_url = settings.REPORT_CHAT_SERVER_URL
            logger.info(f"This is url {report_server_url}")
            response = await client.post(
                f"{report_server_url}/run_research_chat",
                json=input.generate_payload()
            )
            response.raise_for_status()
            result = response.json()

            content = result['final_answer']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Graph server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

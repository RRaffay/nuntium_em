import httpx
from fastapi import HTTPException
import logging
from pydantic import BaseModel
from config import settings
from typing import List, Tuple, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_CHAT_TIMEOUT = settings.DATA_CHAT_TIMEOUT
DEBUG = settings.DEBUG


class DataChatRequest(BaseModel):
    message: str
    data: str
    messages: List[Tuple[str, str]] = []  # List of (content, sender) tuples
    proMode: bool = False
    country: str = ""
    debug: Optional[bool] = DEBUG

    def format_data(self) -> str:
        return f"The data is for {self.country}.\nData:\n{self.data}"

    def generate_payload(self) -> dict:
        return {
            "task": self.message,
            "data": self.format_data(),
            "messages": self.messages,
            "debug": self.debug,
            "pro": self.proMode
        }


async def data_chat(input: DataChatRequest):
    async with httpx.AsyncClient(timeout=DATA_CHAT_TIMEOUT) as client:
        try:
            data_server_url = settings.DATA_CHAT_SERVER_URL
            logger.info(f"Data chat server URL: {data_server_url}")
            response = await client.post(
                f"{data_server_url}/run_data_chat",
                json=input.generate_payload()
            )
            response.raise_for_status()
            result = response.json()

            content = result['final_answer']

            return content
        except httpx.HTTPStatusError as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Data chat server error: {str(e)}")
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=500, detail=f"Unexpected error: {str(e)}")

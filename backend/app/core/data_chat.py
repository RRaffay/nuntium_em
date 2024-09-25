import httpx
from fastapi import HTTPException
import logging
from pydantic import BaseModel
from config import settings
from typing import List, Tuple, Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_CHAT_TIMEOUT = settings.DATA_CHAT_TIMEOUT
DEBUG = settings.DEBUG


class DataChatRequest(BaseModel):
    message: str
    data: Dict[str, Any]
    messages: List[Tuple[str, str]] = []
    proMode: bool = False
    country: str = ""
    debug: Optional[bool] = DEBUG

    def format_data(self) -> str:
        if isinstance(self.data, str):
            return f"The data is for {self.country}.\nData:\n{self.data}"
        elif isinstance(self.data, dict):
            formatted_data = []
            for key, value in self.data.items():
                if isinstance(value, dict) and 'data' in value:
                    formatted_data.append(f"{value.get('label', key)}:")
                    for item in value['data']:
                        formatted_value = item['value']
                        if isinstance(formatted_value, float):
                            formatted_value = f"{formatted_value:.3f}"
                        formatted_data.append(
                            f"  {item['date']}: {formatted_value} {value.get('unit', '')}")
                    formatted_data.append(
                        f"Source: {value.get('source', 'Unknown')}")
                    formatted_data.append(
                        f"Description: {value.get('description', 'No description provided')}")
                else:
                    formatted_data.append(f"{key}: {value}")
            return f"The data is for {self.country}.\nData:\n" + "\n".join(formatted_data)
        else:
            return f"The data is for {self.country}.\nData format not recognized."

    def generate_payload(self) -> dict:
        logger.info(
            f"Generating payload: task: {self.message}\n data: {self.format_data()}\n messages: {self.messages}\n proMode: {self.proMode}\n country: {self.country}")
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

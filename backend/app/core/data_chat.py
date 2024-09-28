import httpx
from fastapi import HTTPException
import logging
from pydantic import BaseModel
from config import settings
from typing import List, Tuple, Optional, Dict, Any
import random

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
    max_data_points: int = 500

    def format_data(self) -> str:
        if isinstance(self.data, str):
            return f"Data for {self.country}: {self.data}"
        elif isinstance(self.data, dict):
            formatted_data = [f"Data for {self.country}:"]
            for key, value in self.data.items():
                if isinstance(value, dict) and 'data' in value:
                    formatted_data.append(f"{value.get('label', key)}:")

                    # Sample data points if there are too many
                    data_points = value['data']
                    if len(data_points) > self.max_data_points:
                        data_points = random.sample(
                            data_points, self.max_data_points)
                        formatted_data.append(
                            f"  (Sampled {self.max_data_points}/{len(value['data'])} points)")

                    # Format data points more concisely
                    formatted_data.extend([
                        f"  {item['date']}: {item['value']:.3f}" if isinstance(
                            item['value'], float) else f"  {item['date']}: {item['value']}"
                        for item in data_points
                    ])

                    # Include source and description only if they're not empty or default
                    if value.get('source') and value['source'] != 'Unknown':
                        formatted_data.append(f"  Source: {value['source']}")
                    if value.get('description') and value['description'] != 'No description provided':
                        formatted_data.append(
                            f"  Description: {value['description']}")
                else:
                    formatted_data.append(f"{key}: {value}")
            return "\n".join(formatted_data)
        else:
            return f"Data format not recognized for {self.country}."

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

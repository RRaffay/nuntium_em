from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
import os
import logging
from typing import Any, Optional
from config import settings

logger = logging.getLogger(__name__)


class LoggingRedisBackend(RedisBackend):
    async def get(self, key: str) -> Optional[Any]:
        value = await super().get(key)
        if value is not None:
            logger.info(f"Cache hit for key: {key}")
        else:
            logger.info(f"Cache miss for key: {key}")
        return value


async def setup_cache():
    redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=False)
    FastAPICache.init(LoggingRedisBackend(redis), prefix="fastapi-cache")

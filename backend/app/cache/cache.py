from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
import os
import logging
from typing import Any, Optional
from config import settings

logger = logging.getLogger(__name__)


async def setup_cache():
    redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

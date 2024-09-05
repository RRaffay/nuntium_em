from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


async def setup_cache():
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = os.getenv("REDIS_PORT", 6379)
    redis_url = f"redis://{redis_host}:{redis_port}"
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

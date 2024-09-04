from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from redis import asyncio as aioredis
import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class TracingRedisBackend(RedisBackend):
    async def get(self, key: str):
        value = await super().get(key)
        if value is None:
            logger.info(f"Cache miss for key: {key}")
        else:
            logger.info(f"Cache hit for key: {key}")
        return value

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        if isinstance(value, str):
            value = value.encode()
        await super().set(key, value, expire)


async def setup_cache():
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = os.getenv("REDIS_PORT", 6379)
    redis_url = f"redis://{redis_host}:{redis_port}"
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=False)
    FastAPICache.init(TracingRedisBackend(redis), prefix="fastapi-cache")


def traced_cache(*args, **kwargs):
    original_cache = cache(*args, **kwargs)

    def wrapper(func):
        @original_cache
        async def traced_func(*func_args, **func_kwargs):
            # Generate custom key
            custom_key = kwargs.get('key_builder', None)
            if custom_key:
                key = custom_key(*func_args, **func_kwargs)
                logger.info(f"Using custom cache key: {key}")
            else:
                key = f"{func.__name__}:{func_args}:{func_kwargs}"

            logger.info(
                f"Cache decorator called for function: {func.__name__} with key: {key}")
            return await func(*func_args, **func_kwargs)
        return traced_func
    return wrapper

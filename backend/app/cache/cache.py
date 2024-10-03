from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
import logging
from config import settings
import json
from functools import wraps
from datetime import date, datetime
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


async def setup_cache():
    redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    logger.info("Redis cache initialized")


def cached_with_logging(*, expire: int):
    def wrapper(func):
        @wraps(func)
        async def wrapped(*args, **kwargs):
            # If we're in a testing environment, bypass the cache
            if settings.TESTING:
                result = await func(*args, **kwargs)
                return JSONResponse(content=result)

            # Extract only the necessary information for the cache key
            country = kwargs.get('country', '')
            user_id = str(kwargs.get('user').id) if 'user' in kwargs else ''

            # Create a simplified cache key
            key = f"{func.__module__}:{func.__name__}:{country}:{user_id}"

            cache = FastAPICache.get_backend()

            try:
                cached_result = await cache.get(key)
                if cached_result is not None:
                    logger.info(f"Cache hit for key: {key}")
                    return JSONResponse(content=json.loads(cached_result))

                logger.info(f"Cache miss for key: {key}")
                result = await func(*args, **kwargs)
                await cache.set(key, json.dumps(result, cls=DateTimeEncoder), expire=expire)
                return JSONResponse(content=result)
            except Exception as e:
                logger.error(f"Cache error for key {key}: {str(e)}")
                # If there's a cache error, execute the function without caching
                result = await func(*args, **kwargs)
                return JSONResponse(content=result)

        return wrapped
    return wrapper

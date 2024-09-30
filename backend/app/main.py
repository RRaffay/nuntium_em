from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

# Logging
import logging

# Auth
from auth.auth_routes import auth_router
from auth.auth_db import User, db

# Redis
from redis import asyncio as aioredis
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache import FastAPICache

# FastAPI
from fastapi import FastAPI, Response
from beanie import init_beanie
from contextlib import asynccontextmanager
from api.routes import router as api_router
from fastapi.middleware.cors import CORSMiddleware

# Rate limiting
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi import Limiter, _rate_limit_exceeded_handler

# Settings
from config import get_settings
settings = get_settings()


settings.setup_logging()
logger = logging.getLogger(__name__)


limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_beanie(
        database=db,
        document_models=[
            User,
        ],
    )
    app.state.limiter = limiter

    # Set up Redis cache
    redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    logger.info(f"Connecting to Redis at: {redis_url}")
    redis = aioredis.from_url(
        redis_url, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

    yield


def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    # Enable CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include FastAPI Users routes
    app.include_router(auth_router)

    # Include API router
    app.include_router(api_router)

    # Add rate limit exception handler
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.get("/health")
    async def health():
        logger.info("Health check")
        return Response(status_code=200)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

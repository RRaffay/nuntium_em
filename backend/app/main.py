from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi import Limiter, _rate_limit_exceeded_handler

# Settings
from config import settings

from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router
from cache.cache import setup_cache

# General fastapi
from contextlib import asynccontextmanager
from beanie import init_beanie
from fastapi import FastAPI, Response

# Auth
from auth.auth_db import User, db
from auth.auth_routes import auth_router

# Logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


# Other
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
    # await setup_cache()
    yield


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

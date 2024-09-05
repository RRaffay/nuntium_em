from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

# Settings
from config import settings

from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router
from cache.cache import setup_cache

# General fastapi
from contextlib import asynccontextmanager
from beanie import init_beanie
from fastapi import FastAPI

# Auth
from auth.auth_db import User, db
from auth.auth_routes import auth_router

# Logging
import logging
logging.basicConfig(level=logging.INFO)

# Other


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_beanie(
        database=db,
        document_models=[
            User,
        ],
    )
    await setup_cache()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

from pydantic_settings import BaseSettings
import os


class BaseConfig(BaseSettings):
    MONGO_URI: str = "mongodb://mongodb:27017"
    MONGO_EVENT_DB_NAME: str = 'gdelt_news'
    MONGO_EVENT_COLLECTION_NAME: str = 'news_summaries'
    MONGO_AUTH_DB_NAME: str = 'nuntium_users'
    JWT_SECRET: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CORS_ORIGINS: list = ["http://localhost:3000"]
    REPORT_SERVER_URL: str = "http://0.0.0.0:8001"
    NEWS_PIPELINE_SERVER_URL: str = "http://0.0.0.0:8002"
    REPORT_CHAT_SERVER_URL: str = "http://0.0.0.0:8003"

    class Config:
        env_file = ".env"


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True


class ProductionConfig(BaseConfig):
    DEBUG: bool = False


def get_settings():
    env = os.getenv("APP_ENV", "development")
    if env == "production":
        return ProductionConfig()
    return DevelopmentConfig()


settings = get_settings()

from pydantic_settings import BaseSettings
import os
from typing import List, Any


class BaseConfig(BaseSettings):
    MONGO_URI: str = "mongodb://mongodb:27017"
    MONGO_EVENT_DB_NAME: str = 'gdelt_news'
    MONGO_EVENT_COLLECTION_NAME: str = 'news_summaries'
    MONGO_AUTH_DB_NAME: str = 'nuntium_users'
    JWT_SECRET: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CORS_ORIGINS: List[str] = []
    FRONTEND_URL: str = "http://localhost:3000"
    REPORT_SERVER_URL: str = "http://0.0.0.0:8001"
    NEWS_PIPELINE_SERVER_URL: str = "http://0.0.0.0:8002"
    REPORT_CHAT_SERVER_URL: str = "http://0.0.0.0:8003"

    class Config:
        env_file = ".env"

    @classmethod
    def parse_env_var(cls, field_name: str, raw_val: str) -> Any:
        print(f"Parsing {field_name}: {raw_val}")  # Debug print
        if field_name == "CORS_ORIGINS":
            parsed = [origin.strip()
                      for origin in raw_val.split(",") if origin.strip()]
            print(f"Parsed CORS_ORIGINS: {parsed}")  # Debug print
            return parsed
        return cls.json_loads(raw_val)


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True


class ProductionConfig(BaseConfig):
    DEBUG: bool = False


def get_settings():
    env = os.getenv("APP_ENV", "development")
    config_class = ProductionConfig if env == "production" else DevelopmentConfig
    settings = config_class()
    print("Loaded settings:")  # Debug print
    for field, value in settings.dict().items():
        print(f"{field}: {value}")
    return settings


settings = get_settings()

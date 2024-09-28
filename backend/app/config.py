from pydantic_settings import BaseSettings
from pydantic import Field
import os
from typing import List, Dict
import logging.config


class BaseConfig(BaseSettings):
    """
    Base configuration class for the application.
    Contains common settings and methods used across different environments.
    """
    MONGO_URI: str = "mongodb://mongodb:27017"
    MONGO_EVENT_DB_NAME: str = 'gdelt_news'
    MONGO_EVENT_COLLECTION_NAME: str = 'news_summaries'
    MONGO_AUTH_DB_NAME: str = 'nuntium_users'
    JWT_SECRET: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CORS_ORIGINS: List[str] = Field(default_factory=list)
    REPORT_SERVER_URL: str = "http://report_server:8001"
    NEWS_PIPELINE_SERVER_URL: str = "http://news_pipeline_server:8002"
    REPORT_CHAT_SERVER_URL: str = "http://research_chat:8003"
    DATA_CHAT_SERVER_URL: str = "http://data_chat:8004"
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    FRONTEND_URL: str = "http://localhost:3000"
    RATE_LIMITS: Dict[str, str]
    ECONDB_API_KEY: str

    # Logging configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: str = "app.log"

    @property
    def LOGGING_CONFIG(self):
        """
        Generate the logging configuration dictionary.

        Returns:
            dict: Logging configuration dictionary.
        """
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": self.LOG_FORMAT,
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": self.LOG_LEVEL,
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "formatter": "default",
                    "filename": self.LOG_FILE,
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                    "level": self.LOG_LEVEL,
                },
            },
            "root": {
                "level": self.LOG_LEVEL,
                "handlers": ["console", "file"],
            },
        }

    def setup_logging(self):
        """
        Set up logging using the LOGGING_CONFIG.
        """
        logging.config.dictConfig(self.LOGGING_CONFIG)

    class Config:
        env_file = ".env"


class DevelopmentConfig(BaseConfig):
    """
    Configuration class for the development environment.
    Inherits from BaseConfig and overrides some settings for development use.
    """
    DEBUG: bool = True
    RATE_LIMITS: Dict[str, str] = {
        "run_country_pipeline": "20/hour",
        "generate_country_report": "30/hour",
        "generate_event_report": "30/hour",
        "research_chat": "20/hour",
        "get_country_metrics": "40/hour",
        "data_question": "20/minute",
        "data_chat": "20/minute",
        "generate_clarifying_questions": "5/minute",
        "open_research_report": "2/minute",
        "update_country": "20/day",
    }
    MAX_REVISIONS_REPORT: int = 1
    REVISION_NUMBER_REPORT: int = 1
    EVENT_REPORT_TIMEOUT: int = 450
    COUNTRY_REPORT_TIMEOUT: int = 450
    REPORT_CHAT_TIMEOUT: int = 330
    DATA_CHAT_TIMEOUT: int = 330  # 5 minutes
    REPORT_CACHE_TIMEOUT: int = 3600  # 1 hour
    METRIC_CACHE_TIMEOUT: int = 86400  # 1 day


class ProductionConfig(BaseConfig):
    """
    Configuration class for the production environment.
    Inherits from BaseConfig and overrides some settings for production use.
    """
    DEBUG: bool = False
    RATE_LIMITS: Dict[str, str] = {
        "run_country_pipeline": "5/hour",
        "generate_country_report": "10/hour",
        "generate_event_report": "10/hour",
        "research_chat": "20/hour",
        "get_country_metrics": "10/hour",
        "data_question": "5/minute",
        "data_chat": "5/minute",
        "generate_clarifying_questions": "2/minute",
        "open_research_report": "1/minute",
        "update_country": "1/day",
    }
    MAX_REVISIONS_REPORT: int = 3
    REVISION_NUMBER_REPORT: int = 1
    EVENT_REPORT_TIMEOUT: int = 450
    COUNTRY_REPORT_TIMEOUT: int = 450
    REPORT_CHAT_TIMEOUT: int = 330  # 5 minutes
    DATA_CHAT_TIMEOUT: int = 330  # 5 minutes
    REPORT_CACHE_TIMEOUT: int = 600  # 10 minutes
    METRIC_CACHE_TIMEOUT: int = 14400  # 4 hours


def get_settings():
    """
    Get the appropriate settings based on the current environment.

    Returns:
        BaseConfig: An instance of either ProductionConfig or DevelopmentConfig.
    """
    env = os.getenv("APP_ENV", "development")
    config_class = ProductionConfig if env == "production" else DevelopmentConfig
    return config_class()


settings = get_settings()

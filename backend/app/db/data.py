# data.py
from typing import Dict
from models import CountryData, Event, ArticleInfo, ClusterArticleSummaries, ClusterSummary, Metadata
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from fastapi import HTTPException
import logging
from config import settings
from core.pipeline import run_pipeline, PipelineInput
from auth.auth_db import User
from datetime import datetime
import os
# Set up logging
logger = logging.getLogger(__name__)

# Global variable to store the database connection
db_client = None


async def get_database():
    global db_client
    if db_client is None:
        try:
            if os.environ.get("APP_ENV") == "testing":
                db_client = AsyncIOMotorClient(
                    "mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
            else:
                db_client = AsyncIOMotorClient(
                    settings.MONGO_URI, serverSelectionTimeoutMS=5000)
            # Verify the connection
            await db_client.admin.command('ismaster')
            logger.info("Successfully connected to MongoDB")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            logger.error(f"MongoDB URI: {settings.MONGO_URI}")
            logger.error(f"Testing {settings.TESTING} environment")
            raise HTTPException(
                status_code=503, detail="Database is unavailable")

    return db_client[settings.MONGO_EVENT_DB_NAME]


async def get_collection():
    db = await get_database()
    return db[settings.MONGO_EVENT_COLLECTION_NAME]

# Dictionary with names of emerging market country names and FIPS 10-4 country codes
addable_countries = {
    "Argentina": "AR",
    "Brazil": "BR",
    "Chile": "CI",
    "China": "CH",
    "Colombia": "CO",
    "Egypt": "EG",
    "India": "IN",
    "Indonesia": "ID",
    "Mexico": "MX",
    "Morocco": "MO",
    "Nigeria": "NI",
    "Pakistan": "PK",
    "Philippines": "RP",
    "South Africa": "SF",
    "Thailand": "TH",
    "Turkey": "TU",
    "Ukraine": "UP",
    "United Kingdom": "UK",
    "Vietnam": "VM",
    "Belarus": "BO",
    "Russia": "RS",
    "Saudi Arabia": "SA",
    "Ethiopia": "ET",
    "Democratic Republic of the Congo": "CG"
}


async def fetch_country_data(user_id: str) -> Dict[str, CountryData]:
    """
    Fetch country data from the MongoDB database.

    Returns:
        dict: A dictionary where keys are country names and values are CountryData objects.
    """
    try:
        collection = await get_collection()
        country_data = {}
        async for document in collection.find({"user_id": user_id}):
            data = document['summaries']
            cluster_article_summaries = ClusterArticleSummaries(**data)
            metadata = cluster_article_summaries.metadata
            clusters = cluster_article_summaries.clusters

            country = metadata.country_name
            events = []

            for cluster_id, cluster_data in clusters.items():
                # Check if cluster_data is already a ClusterSummary object
                if isinstance(cluster_data, ClusterSummary):
                    cluster_summary = cluster_data
                else:
                    cluster_summary = ClusterSummary(**cluster_data)

                # Check if the event is relevant for financial analysis
                if cluster_summary.event_relevance_score > 0:
                    # Create ArticleInfo objects
                    articles = [
                        ArticleInfo(summary=summary, url=url)
                        for summary, url in zip(cluster_summary.article_summaries, cluster_summary.article_urls)
                    ]
                    # Create Event object
                    event = Event(
                        id=cluster_id,
                        title=cluster_summary.event_title,
                        relevance_rationale=cluster_summary.event_relevance_rationale,
                        relevance_score=cluster_summary.event_relevance_score,
                        event_summary=cluster_summary.event_summary,
                        articles=articles
                    )
                    events.append(event)

            # Extract timestamp from the document
            timestamp = document.get('timestamp', datetime.utcnow())
            if isinstance(timestamp, str):
                timestamp = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")

            country_data[country] = CountryData(
                country=country,
                events=events,
                timestamp=timestamp,
                hours=metadata.hours,
                no_relevant_events=metadata.no_financially_relevant_events,
                user_id=user_id
            )
        return country_data
    except Exception as e:
        logger.error(f"Error fetching country data: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error fetching country data")


async def delete_country_data(country: str, user_id: str) -> bool:
    collection = await get_collection()
    result = await collection.delete_one(
        {"summaries.metadata.country_name": country, "user_id": user_id})
    logger.info(f"Deleted {result.deleted_count} documents for {country}")
    return True


async def update_country_data(country: str, user_id: str, hours: int, area_of_interest: str):
    # Run the pipeline with new parameters
    pipeline_input = PipelineInput(
        country=country,
        country_fips_10_4_code=addable_countries[country],
        hours=hours,
        user_id=user_id,
        user_area_of_interest=area_of_interest
    )

    msg = await run_pipeline(pipeline_input)

    # Delete the old data
    await delete_country_data(country, user_id)

    return msg

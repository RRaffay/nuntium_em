from typing import Dict
from models import CountryData, Event, ArticleInfo
from pymongo import MongoClient
import os
from datetime import datetime
from config import settings
from core.pipeline import run_pipeline, PipelineInput
from auth.auth_db import User
from fastapi import HTTPException


country_data: Dict[str, CountryData] = {}

# MongoDB connection setup
mongo_client = MongoClient(settings.MONGO_URI)
mongo_db = mongo_client[settings.MONGO_EVENT_DB_NAME]
mongo_collection = mongo_db[settings.MONGO_EVENT_COLLECTION_NAME]


async def fetch_country_data(user_id: str):
    """
    Fetch country data from the MongoDB database.

    Returns:
        dict: A dictionary where keys are country names and values are CountryData objects.
    """
    country_data = {}
    for document in mongo_collection.find({"user_id": user_id}):
        data = document['summaries']
        country = data["metadata"]["country_name"]
        events = []
        for event_id, event_data in data.items():
            if event_id != "metadata" and event_data.get("event_relevant_for_financial_analysis", False):
                articles = [
                    ArticleInfo(summary=summary, url=url)
                    for summary, url in zip(event_data["article_summaries"], event_data["article_urls"])
                ]
                events.append(Event(
                    id=event_id,
                    title=event_data.get("event_title", "N/A"),
                    relevant_for_financial_analysis=event_data.get(
                        "event_relevant_for_financial_analysis", False),
                    relevance_score=event_data.get("event_relevance_score", 0),
                    event_summary=event_data.get("event_summary", ""),
                    articles=articles
                ))

        # Extract timestamp from the document
        timestamp = document.get('timestamp', datetime.utcnow())
        if isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%Y%m%d_%H%M%S")

        relevant_events_count = data["metadata"].get(
            "no_financially_relevant_events")
        if relevant_events_count is None:
            relevant_events_count = data["metadata"].get(
                "no_matched_clusters", 0)

        country_data[country] = CountryData(
            country=country,
            events=events,
            timestamp=timestamp,
            hours=data["metadata"].get("hours", 0),
            no_relevant_events=relevant_events_count,
            user_id=user_id
        )
    return country_data


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


async def delete_country_data(country: str, user_id: str):
    result = mongo_collection.delete_one(
        {"summaries.metadata.country_name": country, "user_id": user_id})
    if result.deleted_count == 0:
        return False
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

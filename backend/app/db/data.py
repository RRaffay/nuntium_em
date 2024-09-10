from typing import Dict
from models import CountryData, Event, ArticleInfo
from pymongo import MongoClient
import os
from datetime import datetime
from config import settings


country_data: Dict[str, CountryData] = {}

# MongoDB connection setup
mongo_client = MongoClient(settings.MONGO_URI)
mongo_db = mongo_client[settings.MONGO_EVENT_DB_NAME]
mongo_collection = mongo_db[settings.MONGO_EVENT_COLLECTION_NAME]


async def fetch_country_data():
    """
    Fetch country data from the MongoDB database.

    Returns:
        dict: A dictionary where keys are country names and values are CountryData objects.
    """
    country_data = {}
    for document in mongo_collection.find():
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
            no_relevant_events=relevant_events_count
        )
    return country_data


# Dictionary with names of emerging market country names and their Codes Alpha-2 codes
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
}


async def delete_country_data(country: str):
    result = mongo_collection.delete_one(
        {"summaries.metadata.country_name": country})
    if result.deleted_count == 0:
        return False
    return True

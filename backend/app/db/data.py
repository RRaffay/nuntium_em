# data.py
from typing import Dict
from models import CountryData, Event, ArticleInfo, ClusterArticleSummaries, ClusterSummary, Metadata
from pymongo import MongoClient
from datetime import datetime
from config import settings
from core.pipeline import run_pipeline, PipelineInput
from auth.auth_db import User
from fastapi import HTTPException

# MongoDB connection setup
mongo_client = MongoClient(settings.MONGO_URI)
mongo_db = mongo_client[settings.MONGO_EVENT_DB_NAME]
mongo_collection = mongo_db[settings.MONGO_EVENT_COLLECTION_NAME]

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
    country_data = {}
    for document in mongo_collection.find({"user_id": user_id}):
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
            if cluster_summary.event_relevant_for_financial_analysis:
                # Create ArticleInfo objects
                articles = [
                    ArticleInfo(summary=summary, url=url)
                    for summary, url in zip(cluster_summary.article_summaries, cluster_summary.article_urls)
                ]
                # Create Event object
                event = Event(
                    id=cluster_id,
                    title=cluster_summary.event_title,
                    relevant_for_financial_analysis=cluster_summary.event_relevant_for_financial_analysis,
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


async def delete_country_data(country: str, user_id: str) -> bool:
    result = mongo_collection.delete_one(
        {"summaries.metadata.country_name": country, "user_id": user_id})
    return result.deleted_count > 0


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

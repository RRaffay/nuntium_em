import json
from pathlib import Path
from typing import Dict
from models import CountryData, Event, ArticleInfo
from pymongo import MongoClient
import os

data_dir = Path("em_news_analysis/exported_data")
country_data: Dict[str, CountryData] = {}

for file in data_dir.glob("*.json"):
    with open(file, "r") as f:
        data = json.load(f)
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
                    relevant_for_financial_analysis=True,
                    event_summary=event_data.get("event_summary", ""),
                    articles=articles
                ))
        country_data[country] = CountryData(country=country, events=events)

# MongoDB connection setup
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
mongo_client = MongoClient(mongo_uri)
mongo_db = mongo_client['gdelt_news']
mongo_collection = mongo_db['news_summaries']


# Load data from MongoDB
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
                relevant_for_financial_analysis=True,
                event_summary=event_data.get("event_summary", ""),
                articles=articles
            ))
    country_data[country] = CountryData(country=country, events=events)


# Dictionary with names of emerging market country names and their Codes Alpha-2 codes
addable_countries = {
    "Argentina": "AR",
    "Brazil": "BR",
    "Chile": "CL",
    "China": "CN",
    "Colombia": "CO",
    "Egypt": "EG",
    "India": "IN",
    "Indonesia": "ID",
    "Mexico": "MX",
    "Morocco": "MA",
    "Nigeria": "NG",
    "Pakistan": "PK",
    "Philippines": "PH",
    "South Africa": "ZA",
    "Thailand": "TH",
    "Turkey": "TR",
    "Ukraine": "UA",
    "United Kingdom": "GB",
    "Vietnam": "VN",
}

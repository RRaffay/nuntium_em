import json
from pathlib import Path
from typing import Dict
from models import CountryData, Event, ArticleInfo

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

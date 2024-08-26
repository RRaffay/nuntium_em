from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import json
from pathlib import Path
from datetime import datetime
from em_research_agentic.agent import graph

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models


class ArticleInfo(BaseModel):
    summary: str
    url: str


class Event(BaseModel):
    id: str
    title: str = "N/A"  # Added default value
    relevant_for_financial_analysis: bool = False  # Added default value
    cluster_summary: str
    articles: List[ArticleInfo]


class CountryData(BaseModel):
    country: str
    events: List[Event]


# Load data
data_dir = Path("em_news_analysis/exported_data")
country_data: Dict[str, CountryData] = {}

for file in data_dir.glob("*.json"):
    with open(file, "r") as f:
        data = json.load(f)
        country = data["metadata"]["country_name"]
        events = []
        for event_id, event_data in data.items():
            if event_id != "metadata" and event_data.get("cluster_relevant", False):
                articles = [
                    ArticleInfo(summary=summary, url=url)
                    for summary, url in zip(event_data["article_summaries"], event_data["article_urls"])
                ]
                events.append(Event(
                    id=event_id,
                    title=event_data.get("cluster_title", "N/A"),
                    relevant_for_financial_analysis=True,
                    cluster_summary=event_data.get("cluster_summary", ""),
                    articles=articles
                ))
        country_data[country] = CountryData(country=country, events=events)
# Routes


@app.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}


@app.get("/countries")
async def get_countries():
    return list(country_data.keys())


@app.get("/countries/{country}", response_model=CountryData)
async def get_country_data(country: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")
    return country_data[country]


class Report(BaseModel):
    content: str
    generated_at: str


from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa


def economic_report(country: str):
    thread = {"configurable": {"thread_id": "2"}}
    for s in graph.stream({
        'task': f"Write an equity report for {country} based on the recent events.",
        "max_revisions": 1,
        "revision_number": 1,
    }, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    return s['generate']['draft']


def economic_report_event(country: str, event_id: str):
    thread = {"configurable": {"thread_id": "2"}}
    event = next(
        (e for e in country_data[country].events if e.id == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for s in graph.stream({
        'task': f"<Event>\n{event.cluster_summary}\n</Event>. \n\n <Task> Write a report that outlines lucrative financial investments for an emerging market investor in the equities markets based on the above event. \n Research the background of each investment and create comprehensive explanations justifying these investments. \n Avoid general superficial claims and ensure each highlighted investment is analyzed in depth. \n The current date is {datetime.now().strftime('%Y-%m-%d')}\n.</Task> ",
        "max_revisions": 3,
        "revision_number": 1,
    }, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    return s['generate']['draft']


@app.post("/countries/{country}/generate-report", response_model=Report)
async def generate_country_report(country: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = f"# Economic Report for {country}\n\n"
    report_content += economic_report(country) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())


@app.post("/countries/{country}/events/{event_id}/generate-report", response_model=Report)
async def generate_event_report(country: str, event_id: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = f"# Economic Report for Event {event_id} in {country}\n\n"
    report_content += economic_report_event(country, event_id) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

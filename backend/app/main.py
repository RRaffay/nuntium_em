from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import json
from pathlib import Path

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
        country = data["metadata"]["country"]
        events = []
        for event_id, event_data in data.items():
            if event_id != "metadata":
                articles = [
                    ArticleInfo(summary=summary, url=url)
                    for summary, url in zip(event_data["article_summaries"], event_data["article_urls"])
                ]
                events.append(Event(
                    id=event_id,
                    cluster_summary=event_data["cluster_summary"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

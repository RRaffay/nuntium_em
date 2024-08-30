from pydantic import BaseModel
from typing import List
from datetime import datetime


class ArticleInfo(BaseModel):
    summary: str
    url: str


class Event(BaseModel):
    id: str
    title: str
    relevant_for_financial_analysis: bool
    event_summary: str
    articles: List[ArticleInfo]


class CountryData(BaseModel):
    country: str
    events: List[Event]
    timestamp: datetime
    hours: int
    no_matched_clusters: int


class Report(BaseModel):
    content: str
    generated_at: str

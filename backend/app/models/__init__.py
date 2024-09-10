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
    relevance_score: int
    event_summary: str
    articles: List[ArticleInfo]


class CountryData(BaseModel):
    country: str
    events: List[Event]
    timestamp: datetime
    hours: int
    no_relevant_events: int
    user_id: str


class Report(BaseModel):
    content: str
    generated_at: str

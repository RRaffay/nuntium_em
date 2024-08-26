from pydantic import BaseModel
from typing import List


class ArticleInfo(BaseModel):
    summary: str
    url: str


class Event(BaseModel):
    id: str
    title: str = "N/A"  # Added default value
    relevant_for_financial_analysis: bool = False  # Added default value
    event_summary: str
    articles: List[ArticleInfo]


class CountryData(BaseModel):
    country: str
    events: List[Event]


class Report(BaseModel):
    content: str
    generated_at: str

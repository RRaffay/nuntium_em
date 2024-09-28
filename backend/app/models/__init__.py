# models.py
from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime


class Metadata(BaseModel):
    input_sentence: str
    country: str
    country_name: str
    hours: int
    cluster_summarizer_objective: str
    no_clusters: int
    no_matched_clusters: int
    no_articles: int
    no_financially_relevant_events: int = 0


class ClusterSummary(BaseModel):
    event_title: str
    event_relevance_rationale: str
    event_relevance_score: int
    event_summary: str
    article_summaries: List[str]
    article_urls: List[str]


class ClusterArticleSummaries(BaseModel):
    metadata: Metadata
    clusters: Dict[str, ClusterSummary] = {}


class ArticleInfo(BaseModel):
    summary: str
    url: str


class Event(BaseModel):
    id: str
    title: str
    relevance_rationale: str
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


class ChatMessage(BaseModel):
    content: str
    sender: str

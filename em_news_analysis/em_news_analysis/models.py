from pydantic import BaseModel, Field
from typing import List, Dict


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
    event_relevant_for_financial_analysis: bool
    event_relevance_score: int
    event_summary: str
    article_summaries: List[str]
    article_urls: List[str]


class ClusterArticleSummaries(BaseModel):
    metadata: Metadata
    clusters: Dict[str, ClusterSummary] = {}

    def add_cluster_summary(self, cluster_id: int, cluster_summary: ClusterSummary):
        self.clusters[str(cluster_id)] = cluster_summary
        if cluster_summary.event_relevant_for_financial_analysis:
            self.metadata.no_financially_relevant_events += 1


class Event(BaseModel):
    title: str = Field(
        default="", description="The title of the event (5-10 words)"
    )
    summary: str = Field(default="", description="The summary of the event")
    relevant_for_financial_analysis: bool = Field(
        description="Whether the event could be of interest to an investor based on their objective."
    )
    relevance_score: int = Field(
        default=0,
        description=(
            "The relevance score of the event from 0 to 5. "
            "0 means the event is unrelated to objective. "
            "3 means the event could have minor or relation to objective. "
            "5 means the event is highly likely to be related to the objective."
        ),
    )

from pydantic import BaseModel, Field
from typing import List, Dict, Any
import json


class ClusteringScores(BaseModel):
    silhouette: float = 0.0
    davies_bouldin: float = 0.0
    stability: float = 0.0
    relevance: float = 0.0


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

    # New fields for optimal clustering parameters
    optimal_clustering_params: Dict[str, Any] = Field(default_factory=dict)
    clustering_scores: ClusteringScores = Field(
        default_factory=ClusteringScores)

    # New fields for config values
    config_values: Dict[str, Any] = Field(default_factory=dict)

    # Additional useful data points
    total_embeddings_generated: int = 0
    embedding_model: str = ""
    reducer_algorithm: str = ""
    sampling_method: str = ""
    execution_time: float = 0.0
    no_articles_in_noise_cluster: int = 0


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

    def add_cluster_summary(self, cluster_id: int, cluster_summary: ClusterSummary):
        self.clusters[str(cluster_id)] = cluster_summary
        if cluster_summary.event_relevance_score > 2:
            self.metadata.no_financially_relevant_events += 1


class Event(BaseModel):
    title: str = Field(
        default="", description="The title of the event (5-10 words)"
    )
    summary: str = Field(default="", description="The summary of the event")
    relevance_rationale: str = Field(
        default="N/A", description="The rationale for the relevance score. This should be succinct, to the point and contain just the rationale for the relevance score."
    )
    relevance_score: int = Field(
        default=0,
        description=(
            "The relevance score of the event from 0 to 5. "
            "0 means the event is unrelated to objective. "
            "3 means the event could have minor or relation to objective. "
            "5 means the event is highly likely to be related to the objective."
        ),
        ge=0, le=5
    )


class PydanticEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, BaseModel):
            return obj.model_dump()
        return super().default(obj)

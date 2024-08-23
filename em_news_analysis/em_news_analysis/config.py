from dataclasses import dataclass, field
from datetime import timedelta

@dataclass(frozen=True)
class Config:
    embedding_model: str = "text-embedding-3-small"
    cache_size: int = 1000
    min_cluster_size: int = 5
    min_samples: int = 3
    cluster_selection_epsilon: float = 0.5
    max_articles_per_cluster: int = 3
    gdelt_cache_dir: str = "gdelt_cache"
    gdelt_cache_expiry: timedelta = field(default_factory=lambda: timedelta(hours=24))

    def __hash__(self):
        return hash((self.embedding_model, self.cache_size, self.min_cluster_size, 
                     self.min_samples, self.cluster_selection_epsilon, 
                     self.max_articles_per_cluster, self.gdelt_cache_dir, 
                     self.gdelt_cache_expiry))
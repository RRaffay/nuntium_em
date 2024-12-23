from dataclasses import dataclass, field
from datetime import timedelta


@dataclass(frozen=True)
class BaseConfig:
    embedding_model: str = "text-embedding-3-small"
    cache_size: int = 1000
    min_cluster_size: int = 5
    min_samples: int = 3
    cluster_selection_epsilon: float = 0.5
    max_articles_per_cluster: int = 3
    gdelt_cache_dir: str = "gdelt_cache"
    gdelt_cache_expiry: timedelta = field(
        default_factory=lambda: timedelta(hours=24))
    mmr_lambda_param: float = 0.9
    n_components: int = 50
    reducer_algorithm: str = "umap"
    top_n_clusters: int = 20
    similarity_threshold: float = 0.3
    diversity_weight: float = 0.3
    use_cache: bool = True
    embeddings_dir: str = "embeddings_cache"
    save_embeddings: bool = False

    def __hash__(self):
        return hash((self.embedding_model, self.cache_size, self.min_cluster_size,
                     self.min_samples, self.cluster_selection_epsilon,
                     self.max_articles_per_cluster, self.gdelt_cache_dir,
                     self.gdelt_cache_expiry, self.embeddings_dir))


@dataclass(frozen=True)
class ProductionConfig(BaseConfig):
    # Override production-specific settings here
    use_cache: bool = False


@dataclass(frozen=True)
class DevelopmentConfig(BaseConfig):
    # Override development-specific settings here
    use_cache: bool = True
    cache_size: int = 1500
    save_embeddings: bool = True

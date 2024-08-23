import pytest
from datetime import timedelta
from em_news_analysis.config import Config


def test_config_default_values():
    config = Config()
    assert config.embedding_model == "text-embedding-3-small"
    assert config.cache_size == 1000
    assert config.min_cluster_size == 5
    assert config.min_samples == 3
    assert config.cluster_selection_epsilon == 0.5
    assert config.max_articles_per_cluster == 3
    assert config.gdelt_cache_dir == "gdelt_cache"
    assert config.gdelt_cache_expiry == timedelta(hours=24)


def test_config_custom_values():
    custom_config = Config(
        embedding_model="custom-model",
        cache_size=2000,
        min_cluster_size=10,
        min_samples=5,
        cluster_selection_epsilon=0.7,
        max_articles_per_cluster=5,
        gdelt_cache_dir="custom_cache",
        gdelt_cache_expiry=timedelta(hours=12)
    )
    assert custom_config.embedding_model == "custom-model"
    assert custom_config.cache_size == 2000
    assert custom_config.min_cluster_size == 10
    assert custom_config.min_samples == 5
    assert custom_config.cluster_selection_epsilon == 0.7
    assert custom_config.max_articles_per_cluster == 5
    assert custom_config.gdelt_cache_dir == "custom_cache"
    assert custom_config.gdelt_cache_expiry == timedelta(hours=12)


def test_config_hash():
    config1 = Config()
    config2 = Config()
    assert hash(config1) == hash(config2)

    config3 = Config(cache_size=2000)
    assert hash(config1) != hash(config3)

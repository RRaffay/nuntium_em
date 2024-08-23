from typing import List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import HDBSCAN
from .config import Config

def cluster_embeddings(embeddings: np.ndarray, config: Config) -> np.ndarray:
    """
    Cluster the input embeddings using HDBSCAN from scikit-learn.
    """
    try:
        clusterer = HDBSCAN(
            min_cluster_size=config.min_cluster_size,
            min_samples=config.min_samples,
            cluster_selection_epsilon=config.cluster_selection_epsilon,
            metric='euclidean'
        )
        return clusterer.fit_predict(embeddings)
    except Exception as e:
        raise ValueError(f"Clustering failed: {str(e)}")

def match_clusters(input_embedding: List[float], embeddings: np.ndarray, clusters: np.ndarray) -> List[int]:
    """
    Match input embedding to clusters based on cosine similarity.
    """
    try:
        similarities = cosine_similarity(np.array(input_embedding).reshape(1, -1), embeddings)
        cluster_similarities = [similarities[0][clusters == i].mean() for i in range(max(clusters) + 1) if i != -1]
        return sorted(range(len(cluster_similarities)), key=lambda i: cluster_similarities[i], reverse=True)
    except Exception as e:
        raise ValueError(f"Error in matching clusters: {str(e)}")
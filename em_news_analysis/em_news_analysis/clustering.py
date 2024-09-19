# Updated clustering.py

from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA
import umap
from .config import Config


def cluster_embeddings(
    embeddings: np.ndarray,
    config: Config,
    clustering_algorithm=None,
    reduce_dimensionality: bool = True,
    **kwargs
) -> np.ndarray:
    """
    Cluster the input embeddings using the specified clustering algorithm.
    Optionally performs dimensionality reduction before clustering.

    Args:
        embeddings (np.ndarray): Numpy array of embeddings.
        config (Config): Configuration object.
        clustering_algorithm: Clustering algorithm to use. If None, defaults to HDBSCAN.
        reduce_dimensionality (bool): Whether to reduce dimensionality before clustering.
        reducer_algorithm (str): Algorithm for dimensionality reduction ('umap' or 'pca').
        n_components (int): Number of dimensions to reduce to.
        **kwargs: Additional keyword arguments for the clustering algorithm.

    Returns:
        np.ndarray: Array of cluster labels.
    """
    try:
        # Dimensionality Reduction
        if reduce_dimensionality:
            if config.reducer_algorithm == 'umap':
                reducer = umap.UMAP(
                    n_components=config.n_components,
                    random_state=None,
                    n_jobs=-1
                )
            elif config.reducer_algorithm == 'pca':
                reducer = PCA(n_components=config.n_components,
                              random_state=None)
            else:
                raise ValueError(
                    f"Unsupported reducer_algorithm: {config.reducer_algorithm}")

            embeddings_reduced = reducer.fit_transform(embeddings)
        else:
            embeddings_reduced = embeddings

        # Clustering
        if clustering_algorithm is None:
            # Default to HDBSCAN
            clusterer = HDBSCAN(
                min_cluster_size=config.min_cluster_size,
                min_samples=config.min_samples,
                cluster_selection_epsilon=config.cluster_selection_epsilon,
                metric='euclidean',
                **kwargs
            )
        else:
            # Use the specified clustering algorithm
            clusterer = clustering_algorithm(**kwargs)

        cluster_labels = clusterer.fit_predict(embeddings_reduced)
        return cluster_labels
    except Exception as e:
        raise ValueError(f"Clustering failed: {str(e)}")

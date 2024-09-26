# Updated clustering.py
import numpy as np
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.model_selection import ParameterGrid
from joblib import Parallel, delayed
from typing import List, Any, Callable, Dict, Tuple
import warnings
from sklearn.model_selection import ParameterGrid
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA
import umap
from .config import Config
import logging

logger = logging.getLogger(__name__)


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


def optimize_clustering(
    embeddings: np.ndarray,
    param_grid: Dict[str, List[Any]],
    input_embedding: np.ndarray,
    scoring_functions: Dict[str, Callable] = None,
    clustering_algorithm: Callable = None,
    reducer_algorithms: Dict[str, Callable] = None,
    n_jobs: int = -1
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Optimize clustering and dimensionality reduction hyperparameters using parallel grid search.
    Uses an ensemble of scoring functions to evaluate clustering performance.

    Args:
        embeddings (np.ndarray): Embeddings to cluster.
        param_grid (Dict[str, List[Any]]): Grid of hyperparameters to search.
        input_embedding (np.ndarray): Embedding of the input sentence for relevance scoring.
        scoring_functions (Dict[str, Callable]): Dictionary of scoring functions to use.
        clustering_algorithm (Callable): Clustering algorithm to use.
        reducer_algorithms (Dict[str, Callable]): Mapping from reducer_algorithm name to the reducer class.
        n_jobs (int): Number of jobs to run in parallel. -1 means using all processors.

    Returns:
        Tuple[np.ndarray, Dict[str, Any]]: Best cluster labels and best hyperparameters.
    """
    if scoring_functions is None:
        scoring_functions = {
            'silhouette': silhouette_score,
            'davies_bouldin': davies_bouldin_score
        }

    if clustering_algorithm is None:
        clustering_algorithm = HDBSCAN

    if reducer_algorithms is None:
        reducer_algorithms = {
            'umap': umap.UMAP
        }

    param_list = list(ParameterGrid(param_grid))

    # Suppress warnings for cleaner output
    warnings.filterwarnings("ignore")

    def evaluate_params(params):
        try:
            # Extract dimensionality reduction parameters
            reduce_dimensionality = params.get('reduce_dimensionality', True)
            reducer_algorithm_name = params.get('reducer_algorithm', 'umap')
            n_components = params.get('n_components', 50)

            # Remove dimensionality reduction parameters from params
            clustering_params = params.copy()
            clustering_params.pop('reduce_dimensionality', None)
            clustering_params.pop('reducer_algorithm', None)
            clustering_params.pop('n_components', None)

            # Dimensionality Reduction
            if reduce_dimensionality:
                if reducer_algorithm_name not in reducer_algorithms:
                    raise ValueError(
                        f"Unsupported reducer_algorithm: {reducer_algorithm_name}")
                reducer_class = reducer_algorithms[reducer_algorithm_name]
                if reducer_algorithm_name == 'umap':
                    reducer = reducer_class(n_components=n_components)
                else:
                    reducer = reducer_class(n_components=n_components)
                embeddings_reduced = reducer.fit_transform(embeddings)

                # Transform the input embedding
                input_embedding_reduced = reducer.transform(
                    input_embedding.reshape(1, -1))
            else:
                embeddings_reduced = embeddings
                input_embedding_reduced = input_embedding.reshape(1, -1)

            # Clustering
            clusterer = clustering_algorithm(**clustering_params)
            labels = clusterer.fit_predict(embeddings_reduced)

            # Exclude noise points (-1) for scoring if applicable
            unique_labels = set(labels)
            if len(unique_labels) > 1 and len(unique_labels) < len(embeddings_reduced):
                valid_indices = labels != -1 if -1 in labels else slice(None)
                embeddings_valid = embeddings_reduced[valid_indices]
                labels_valid = labels[valid_indices]

                # Compute individual scores
                scores = {}

                # Silhouette Score (Higher is better)
                silhouette_avg = silhouette_score(
                    embeddings_valid, labels_valid) if len(set(labels_valid)) > 1 else 0
                scores['silhouette'] = silhouette_avg

                # Davies-Bouldin Index (Lower is better)
                davies_bouldin = davies_bouldin_score(
                    embeddings_valid, labels_valid) if len(set(labels_valid)) > 1 else np.inf
                # Invert Davies-Bouldin Index so that higher is better
                scores['davies_bouldin'] = -davies_bouldin

                # Cluster Stability (Higher is better)
                cluster_stabilities = clusterer.probabilities_[valid_indices]
                stability_avg = np.mean(cluster_stabilities)
                scores['stability'] = stability_avg

                # Relevance Score (Higher is better)
                # Compute cluster centroids
                centroids = []
                for label in set(labels_valid):
                    cluster_points = embeddings_valid[labels_valid == label]
                    centroid = np.mean(cluster_points, axis=0)
                    centroids.append(centroid)
                centroids = np.array(centroids)

                # Compute similarities to input embedding
                similarities = cosine_similarity(
                    input_embedding_reduced, centroids)[0]
                relevance_score = np.max(similarities)
                scores['relevance'] = relevance_score

                # Combine scores into a composite score
                # You can adjust the weights as needed
                composite_score = (
                    scores['silhouette'] * 0.4 +
                    scores['davies_bouldin'] * 0.3 +
                    scores['stability'] * 0.2 +
                    scores['relevance'] * 0.1
                )

                return (composite_score, labels, params)
            else:
                # Return a very low score if clustering is not meaningful
                return (-np.inf, None, params)
        except Exception as e:
            print(f"Failed for parameters {params}: {e}")
            return (-np.inf, None, params)

    # Run the parameter evaluations in parallel
    results = Parallel(n_jobs=n_jobs)(
        delayed(evaluate_params)(params) for params in param_list
    )

    # Find the best result
    best_score = -np.inf
    best_labels = None
    best_params = None

    for score, labels, params in results:
        if score > best_score:
            best_score = score
            best_labels = labels
            best_params = params

    if best_labels is None:
        raise ValueError("Clustering failed for all parameter combinations.")

    logger.info(f"Best parameters: {best_params}")
    logger.info(f"Best score: {best_score}")

    return best_labels, best_params

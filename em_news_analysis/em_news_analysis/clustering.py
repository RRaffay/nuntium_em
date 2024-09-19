# Updated clustering.py

from joblib import Parallel, delayed
import warnings
from sklearn.model_selection import ParameterGrid
from sklearn.metrics import silhouette_score
from typing import List, Dict, Any, Tuple, Callable
from typing import List, Dict, Any, Tuple
import numpy as np
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


# clustering.py


def optimize_clustering(
    embeddings: np.ndarray,
    param_grid: Dict[str, List[Any]],
    scoring_function: Callable = None,
    clustering_algorithm: Callable = None,
    reducer_algorithms: Dict[str, Callable] = None,
    n_jobs: int = -1
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Optimize clustering and dimensionality reduction hyperparameters using parallel grid search.

    Args:
        embeddings (np.ndarray): Embeddings to cluster.
        param_grid (Dict[str, List[Any]]): Grid of hyperparameters to search.
        scoring_function (Callable): Function to evaluate clustering performance.
        clustering_algorithm (Callable): Clustering algorithm to use.
        reducer_algorithms (Dict[str, Callable]): Mapping from reducer_algorithm name to the reducer class.
        n_jobs (int): Number of jobs to run in parallel. -1 means using all processors.

    Returns:
        Tuple[np.ndarray, Dict[str, Any]]: Best cluster labels and best hyperparameters.
    """
    if scoring_function is None:
        scoring_function = silhouette_score

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

            # Remove dimensionality reduction parameters from params to avoid passing them to the clustering algorithm
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
                    reducer = reducer_class(
                        n_components=n_components)
                else:
                    reducer = reducer_class(
                        n_components=n_components)
                embeddings_reduced = reducer.fit_transform(embeddings)
            else:
                embeddings_reduced = embeddings

            # Clustering
            clusterer = clustering_algorithm(**clustering_params)
            labels = clusterer.fit_predict(embeddings_reduced)

            # Exclude noise points (-1) for scoring if applicable
            unique_labels = set(labels)
            if len(unique_labels) > 1 and len(unique_labels) < len(embeddings_reduced):
                valid_indices = labels != -1 if -1 in labels else slice(None)
                score = scoring_function(
                    embeddings_reduced[valid_indices], labels[valid_indices])

                return (score, labels, params)
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

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List


def match_clusters(input_embedding: List[float], embeddings: np.ndarray, clusters: np.ndarray, top_n: int = 20) -> List[int]:
    """
    Match input embedding to clusters based on cosine similarity.
    Uses an enhanced method that computes average similarity per cluster.
    Args:
    - input_embedding: Embedding of the input sentence.
    - embeddings: Numpy array of embeddings.
    - clusters: Array of cluster labels.
    - top_n: Number of top clusters to return.
    Returns:
    - List of cluster labels ranked by relevance.
    """
    try:
        # Compute similarities between input embedding and all embeddings
        similarities = cosine_similarity(
            np.array(input_embedding).reshape(1, -1), embeddings)[0]

        # Create a DataFrame with similarities and cluster labels
        similarity_df = pd.DataFrame({
            'similarity': similarities,
            'cluster': clusters
        })

        # Group by clusters and compute average similarity per cluster
        cluster_similarities = similarity_df.groupby('cluster')[
            'similarity'].mean()

        # Exclude noise points (cluster label == -1)
        cluster_similarities = cluster_similarities.drop(-1, errors='ignore')

        # Get top N clusters with highest average similarity
        top_clusters = cluster_similarities.nlargest(top_n).index.tolist()

        return top_clusters
    except Exception as e:
        raise ValueError(f"Error in matching clusters: {str(e)}")


# def match_clusters(input_embedding: List[float], embeddings: np.ndarray, clusters: np.ndarray) -> List[int]:
#     """
#     Match input embedding to clusters based on cosine similarity.
#     """
#     try:
#         similarities = cosine_similarity(
#             np.array(input_embedding).reshape(1, -1), embeddings)
#         cluster_similarities = [similarities[0][clusters == i].mean(
#         ) for i in range(max(clusters) + 1) if i != -1]
#         return sorted(range(len(cluster_similarities)), key=lambda i: cluster_similarities[i], reverse=True)
#     except Exception as e:
#         raise ValueError(f"Error in matching clusters: {str(e)}")

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List


def match_clusters(
    input_embedding: List[float],
    embeddings: np.ndarray,
    clusters: np.ndarray,
    top_n: int = 20,
    similarity_threshold: float = 0.3,
    diversity_weight: float = 0.3
) -> List[int]:
    """
    Match input embedding to clusters based on cosine similarity.
    Uses an enhanced method that computes average similarity per cluster.
    Selects diverse clusters to avoid repetition.
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

        # Get clusters with similarity above the threshold
        cluster_similarities = cluster_similarities[cluster_similarities >
                                                    similarity_threshold]

        # Sort clusters by similarity
        sorted_clusters = cluster_similarities.sort_values(ascending=False)

        selected_clusters = []
        for _ in range(min(top_n, len(sorted_clusters))):
            if not selected_clusters:
                # Select the most similar cluster first
                next_cluster = sorted_clusters.index[0]
            else:
                # Compute diversity scores
                diversity_scores = []
                for cluster in sorted_clusters.index:
                    if cluster not in selected_clusters:
                        avg_similarity_to_selected = np.mean([
                            cosine_similarity(
                                embeddings[clusters == cluster].mean(
                                    axis=0).reshape(1, -1),
                                embeddings[clusters == sc].mean(
                                    axis=0).reshape(1, -1)
                            )[0][0] for sc in selected_clusters
                        ])
                        diversity_score = diversity_weight * (1 - avg_similarity_to_selected) + \
                            (1 - diversity_weight) * sorted_clusters[cluster]
                        diversity_scores.append((cluster, diversity_score))

                # Select the cluster with the highest diversity score
                next_cluster = max(diversity_scores, key=lambda x: x[1])[0]

            selected_clusters.append(next_cluster)
            sorted_clusters = sorted_clusters.drop(next_cluster)

        return selected_clusters
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

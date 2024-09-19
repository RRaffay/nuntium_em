import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List


def sample_data(df: pd.DataFrame, process_all: bool, sample_size: int) -> pd.DataFrame:
    if process_all or sample_size >= len(df):
        return df

    # Create a significance score based on GoldsteinScale and NumMentions
    df['significance'] = df['GoldsteinScale'].abs() * df['NumMentions']

    # Handle missing values
    df['significance'].fillna(0, inplace=True)

    # Sort the DataFrame based on significance score in descending order
    df_sorted = df.sort_values(by='significance', ascending=False)

    # Select the top 'sample_size' rows
    sampled_df = df_sorted.head(sample_size).copy()

    # Drop the significance column as it's no longer needed
    sampled_df.drop(columns=['significance'], inplace=True)

    return sampled_df


def sample_articles(
    urls: List[str],
    cluster_embeddings: np.ndarray,
    articles_metadata: pd.DataFrame,
    max_articles: int,
    lambda_param: float = 0.5
) -> List[str]:
    """
    Sample articles using Maximal Marginal Relevance to balance relevance, diversity, and article quality.

    Args:
        urls (List[str]): List of URLs in the cluster.
        cluster_embeddings (np.ndarray): Embeddings of the cluster articles.
        articles_metadata (pd.DataFrame): Metadata for the articles.
        max_articles (int): Maximum number of articles to sample.
        lambda_param (float): Trade-off parameter between relevance and diversity.

    Returns:
        List[str]: List of sampled article URLs.
    """
    # Compute the centroid of the cluster
    centroid = cluster_embeddings.mean(axis=0).reshape(1, -1)

    # Compute similarities to the centroid (relevance)
    similarities = cosine_similarity(cluster_embeddings, centroid).flatten()

    # Normalize similarities
    similarities = (similarities - similarities.min()) / \
        (similarities.max() - similarities.min() + 1e-10)

    # Compute article quality scores based on metadata
    # Example: Use NumMentions, AvgTone, and GoldsteinScale as quality indicators
    # You can adjust this formula based on available metadata
    quality_scores = (
        articles_metadata['NumMentions'].fillna(0) +
        articles_metadata['GoldsteinScale'].fillna(0) +
        articles_metadata['AvgTone'].fillna(0)
    )
    # Normalize quality scores
    quality_scores = (quality_scores - quality_scores.min()) / \
        (quality_scores.max() - quality_scores.min() + 1e-10)

    # Combine relevance and quality into a single score
    combined_scores = lambda_param * similarities + \
        (1 - lambda_param) * quality_scores.values

    # Initialize selected and candidate indices
    selected_indices = []
    candidate_indices = list(range(len(urls)))

    for _ in range(min(max_articles, len(urls))):
        mmr_scores = []
        for idx in candidate_indices:
            if not selected_indices:
                diversity = 0
            else:
                selected_embeddings = cluster_embeddings[selected_indices]
                diversity = cosine_similarity(
                    cluster_embeddings[idx].reshape(1, -1),
                    selected_embeddings
                ).max()
            mmr_score = combined_scores[idx] - lambda_param * diversity
            mmr_scores.append((mmr_score, idx))

        # Select the candidate with the highest MMR score
        mmr_scores.sort(reverse=True)
        _, best_idx = mmr_scores[0]
        selected_indices.append(best_idx)
        candidate_indices.remove(best_idx)

    sampled_urls = [urls[i] for i in selected_indices]
    return sampled_urls

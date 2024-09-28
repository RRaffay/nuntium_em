from typing import List
import pycountry
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# First, let's define a dictionary mapping FIPS 10-4 codes to country names
FIPS_TO_COUNTRY = {
    "AR": "Argentina",
    "BR": "Brazil",
    "CI": "Chile",
    "CH": "China",
    "CO": "Colombia",
    "EG": "Egypt",
    "IN": "India",
    "ID": "Indonesia",
    "MX": "Mexico",
    "MO": "Morocco",
    "NI": "Nigeria",
    "PK": "Pakistan",
    "RP": "Philippines",
    "SF": "South Africa",
    "TH": "Thailand",
    "TU": "Turkey",
    "UP": "Ukraine",
    "UK": "United Kingdom",
    "VM": "Vietnam",
    "BO": "Belarus",
    "RS": "Russia",
    "SA": "Saudi Arabia",
    "ET": "Ethiopia",
    "CG": "Democratic Republic of the Congo"
}


def get_country_name(country_code: str) -> str:
    """
    Convert GDELT FIPS 10-4 country code to country name.

    Args:
    country_code (str): The FIPS 10-4 country code used by GDELT.

    Returns:
    str: The corresponding country name, or "Unknown" if not found.
    """
    return FIPS_TO_COUNTRY.get(country_code.upper(), "Unknown")


def sample_articles(urls: List[str], max_articles: int) -> List[str]:
    """
    Sample representative articles from the given URLs, ensuring no duplicates.

    Args:
        urls (List[str]): List of URLs to sample from.
        max_articles (int): Maximum number of articles to sample.

    Returns:
        List[str]: List of sampled unique URLs.
    """
    unique_urls = list(dict.fromkeys(
        urls))  # Remove duplicates while maintaining order
    return unique_urls[:max_articles]


def sample_articles(
    urls: List[str],
    cluster_embeddings: np.ndarray,
    max_articles: int
) -> List[str]:
    """
    Sample representative articles from the given URLs based on their proximity
    to the cluster centroid.

    Args:
        urls (List[str]): List of URLs in the cluster.
        cluster_embeddings (np.ndarray): Embeddings of the cluster articles.
        max_articles (int): Maximum number of articles to sample.

    Returns:
        List[str]: List of sampled article URLs.
    """
    centroid = cluster_embeddings.mean(axis=0).reshape(1, -1)
    similarities = cosine_similarity(cluster_embeddings, centroid).flatten()
    sorted_indices = np.argsort(-similarities)
    sampled_urls = [urls[i] for i in sorted_indices[:max_articles]]
    return sampled_urls


def sample_articles_mmr(
    urls: List[str],
    cluster_embeddings: np.ndarray,
    max_articles: int,
    lambda_param: float = 0.9
) -> List[str]:
    """
    Sample articles using Maximal Marginal Relevance to balance relevance and diversity.

    Args:
        urls (List[str]): List of URLs in the cluster.
        cluster_embeddings (np.ndarray): Embeddings of the cluster articles.
        max_articles (int): Maximum number of articles to sample.
        lambda_param (float): Trade-off parameter between relevance and diversity.

    Returns:
        List[str]: List of sampled article URLs.
    """
    centroid = cluster_embeddings.mean(axis=0).reshape(1, -1)
    similarities = cosine_similarity(cluster_embeddings, centroid).flatten()
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
            mmr_score = lambda_param * \
                similarities[idx] - (1 - lambda_param) * diversity
            mmr_scores.append((mmr_score, idx))

        mmr_scores.sort(reverse=True)
        _, best_idx = mmr_scores[0]
        selected_indices.append(best_idx)
        candidate_indices.remove(best_idx)

    sampled_urls = [urls[i] for i in selected_indices]
    return sampled_urls

from typing import List


def sample_articles(urls: List[str], max_articles: int) -> List[str]:
    """
    Sample representative articles from the given URLs.
    """
    return urls[:max_articles]

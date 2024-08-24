from typing import List
import pycountry


def sample_articles(urls: List[str], max_articles: int) -> List[str]:
    """
    Sample representative articles from the given URLs.
    """
    return urls[:max_articles]


def get_country_name(country_code: str) -> str:
    """
    Convert ISO 3166-1 alpha-2 country code to country name.

    Args:
    country_code (str): The ISO 3166-1 alpha-2 country code.

    Returns:
    str: The corresponding country name, or "Unknown" if not found.
    """
    try:
        return pycountry.countries.get(alpha_2=country_code).name
    except AttributeError:
        return "Unknown"

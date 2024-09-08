from typing import List
import pycountry

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
    # Add more countries as needed
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
    """
    unique_urls = list(dict.fromkeys(
        urls))  # Remove duplicates while maintaining order
    return unique_urls[:max_articles]

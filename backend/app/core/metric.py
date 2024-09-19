# core/metric.py

import yfinance as yf
import requests
import pandas as pd
import logging
from typing import Dict, Any, List
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)

WORLD_BANK_API_URL = "https://api.worldbank.org/v2"  # Change to HTTPS

# Map country names to ISO 3166-1 alpha-2 codes
COUNTRY_NAME_TO_ISO2 = {
    "Argentina": "AR",
    "Brazil": "BR",
    "China": "CN",
    "India": "IN",
    "South Africa": "ZA",
    "Pakistan": "PK",
    "Indonesia": "ID",
    "Nigeria": "NG",
    "Mexico": "MX",
    "Ethiopia": "ET",
    "Philippines": "PH",
    "Egypt": "EG",
    "Vietnam": "VN",
    "Democratic Republic of the Congo": "CD",
    # Add more country mappings as needed
}

# Define the indicators we want to fetch
INDICATORS = {
    "gdp_per_capita": "NY.GDP.PCAP.CD",
    "inflation": "FP.CPI.TOTL.ZG",
    "unemployment": "SL.UEM.TOTL.ZS",
    # Add more indicators as needed
}

# Map country names to currency pairs for exchange rates
CURRENCY_PAIRS = {
    "Argentina": "USDARS=X",
    "Brazil": "USDBRL=X",
    "China": "USDCNY=X",
    "India": "USDINR=X",
    "South Africa": "USDZAR=X",
    "Pakistan": "USDPKR=X",
    "Indonesia": "USDIDR=X",
    "Nigeria": "USDNGN=X",
    "Mexico": "USDMXN=X",
    "Egypt": "USDEGP=X",
    "Vietnam": "USDVND=X",
    "Philippines": "USDPHP=X",
    # Add more mappings as needed
}

# Map country names to stock index symbols
STOCK_INDEX_SYMBOLS = {
    "Argentina": "^MERV",
    "Brazil": "^BVSP",
    "China": "000001.SS",
    "India": "^BSESN",
    "South Africa": "JSE.JO",
    "Pakistan": "^KSE",
    "Indonesia": "^JKSE",
    "Nigeria": "NGSEINDEX",
    "Mexico": "^MXX",
    "Egypt": "EGX30.CA",
    "Vietnam": "^VNINDEX",
    "Philippines": "^PSEI",
    # Add more mappings as needed
}


def fetch_indicator_data(country_code: str, indicator_code: str) -> List[Dict[str, Any]]:
    """
    Fetches indicator data for a country from the World Bank API.

    Args:
        country_code (str): The ISO 3166-1 alpha-2 country code.
        indicator_code (str): The World Bank indicator code.

    Returns:
        List[Dict[str, Any]]: A list of data points.
    """
    url = f"{WORLD_BANK_API_URL}/country/{country_code}/indicator/{indicator_code}?format=json&per_page=1000"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        if len(data) >= 2:
            return data[1]
        else:
            return []
    except RequestException as e:
        logger.error(f"Error fetching data from World Bank API: {e}")
        return []


def get_country_metrics(country_name: str) -> Dict[str, Any]:
    """
    Fetches all indicators for a given country.

    Args:
        country_name (str): The name of the country.

    Returns:
        Dict[str, Any]: A dictionary containing the indicator data.
    """
    country_code = COUNTRY_NAME_TO_ISO2.get(country_name)
    if not country_code:
        raise ValueError(f"Country code for {country_name} not found.")

    metrics = {}
    for metric_name, indicator_code in INDICATORS.items():
        try:
            data = fetch_indicator_data(country_code, indicator_code)
            metrics[metric_name] = data
        except Exception as e:
            logger.error(
                f"Error fetching {metric_name} for {country_name}: {e}")
            metrics[metric_name] = []  # Use an empty list for failed fetches
    return metrics


def fetch_exchange_rate_series(currency_pair: str) -> List[Dict[str, Any]]:
    """
    Fetches historical exchange rate data using yfinance.

    Args:
        currency_pair (str): The currency pair symbol (e.g., 'USDARS=X').

    Returns:
        List[Dict[str, Any]]: A list of exchange rate data points.
    """
    try:
        data = yf.download(currency_pair, period='1y', interval='1d')
        data_points = []
        for date, row in data.iterrows():
            data_points.append({
                'date': date.strftime('%Y-%m-%d'),
                'value': float(row['Close']) if not pd.isnull(row['Close']) else None
            })
        return data_points
    except Exception as e:
        logger.error(f"Error fetching exchange rate series data: {e}")
        return []


def fetch_stock_index_series(symbol: str) -> List[Dict[str, Any]]:
    """
    Fetches historical stock index data using yfinance.

    Args:
        symbol (str): The stock index symbol (e.g., '^MERV' for Argentina).

    Returns:
        List[Dict[str, Any]]: A list of stock index data points.
    """
    try:
        data = yf.download(symbol, period='1y', interval='1d')
        data_points = []
        for date, row in data.iterrows():
            data_points.append({
                'date': date.strftime('%Y-%m-%d'),
                'value': float(row['Close']) if not pd.isnull(row['Close']) else None
            })
        return data_points
    except Exception as e:
        logger.error(f"Error fetching stock index series data: {e}")
        return []


def get_country_metrics(country_name: str) -> Dict[str, Any]:
    """
    Fetches all indicators for a given country.

    Args:
        country_name (str): The name of the country.

    Returns:
        Dict[str, Any]: A dictionary containing the indicator data.
    """
    country_code = COUNTRY_NAME_TO_ISO2.get(country_name)
    if not country_code:
        raise ValueError(f"Country code for {country_name} not found.")

    metrics = {}
    for metric_name, indicator_code in INDICATORS.items():
        try:
            data = fetch_indicator_data(country_code, indicator_code)
            metrics[metric_name] = data
        except Exception as e:
            logger.error(
                f"Error fetching {metric_name} for {country_name}: {e}")
            metrics[metric_name] = []  # Use an empty list for failed fetches

    # Fetch exchange rate data
    currency_pair = CURRENCY_PAIRS.get(country_name)
    if currency_pair:
        exchange_rate_data = fetch_exchange_rate_series(currency_pair)
        metrics['exchange_rate'] = exchange_rate_data

    # Fetch stock index data
    stock_index_symbol = STOCK_INDEX_SYMBOLS.get(country_name)
    if stock_index_symbol:
        stock_index_data = fetch_stock_index_series(stock_index_symbol)
        metrics['stock_index'] = stock_index_data

    return metrics


def main():
    """
    Demonstrates the execution of the metric functions when the file is run directly.
    """
    print("Running metric.py directly")

    # Example usage of get_country_metrics
    test_country = "Brazil"
    try:
        metrics = get_country_metrics(test_country)
        print(f"\nMetrics for {test_country}:")
        for metric_name, data in metrics.items():
            print(
                f"{metric_name}: {data[:1] if data else 'No data available'}")
    except ValueError as e:
        print(f"Error: {e}")

    # Example usage of fetch_indicator_data
    test_country_code = "BR"
    test_indicator = "NY.GDP.PCAP.CD"
    print(f"\nFetching GDP per capita data for {test_country_code}:")
    data = fetch_indicator_data(test_country_code, test_indicator)
    print(f"Data points: {len(data)}")
    print(f"Latest data point: {data[0] if data else 'No data available'}")


if __name__ == "__main__":
    main()

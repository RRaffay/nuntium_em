# core/metric.py

import yfinance as yf
import requests
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List
from requests.exceptions import RequestException, HTTPError
import os
from dotenv import load_dotenv
from config import settings

load_dotenv()

logger = logging.getLogger(__name__)

# Set your API keys here or use environment variables
# Remove TradingEconomics API since we're focusing on available data
# TRADING_ECONOMICS_API_KEY = os.getenv('TRADING_ECONOMICS_API_KEY')

WORLD_BANK_API_URL = "https://api.worldbank.org/v2"

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
    "Russia": "RU",
    "Saudi Arabia": "SA",
    # Add more country mappings as needed
}

# Define the indicators we want to fetch from the World Bank API
INDICATORS = {
    "gdp_per_capita": "NY.GDP.PCAP.CD",
    "gdp_growth": "NY.GDP.MKTP.KD.ZG",
    "inflation": "FP.CPI.TOTL.ZG",
    "unemployment": "SL.UEM.TOTL.ZS",
    "current_account_balance": "BN.CAB.XOKA.CD",
    "foreign_exchange_reserves": "FI.RES.TOTL.CD",
    "debt_to_gdp": "GC.DOD.TOTL.GD.ZS",
    "population": "SP.POP.TOTL",
    "exports_of_goods_and_services": "NE.EXP.GNFS.ZS",
    "imports_of_goods_and_services": "NE.IMP.GNFS.ZS",
    "manufacturing_value_added": "NV.IND.MANF.ZS",
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
    "Russia": "USDRUB=X",
    "Saudi Arabia": "USDSAR=X",
    # Add more mappings as needed
}

# Map country names to stock index symbols
STOCK_INDEX_SYMBOLS = {
    "Argentina": "^MERV",
    "Brazil": "^BVSP",
    "China": "000001.SS",
    "India": "^BSESN",
    "South Africa": "^J203.JO",  # Adjusted symbol for South Africa All Share Index
    "Pakistan": "^KSE",
    "Indonesia": "^JKSE",
    "Nigeria": "NGSEINDX",  # Adjusted symbol for Nigeria
    "Mexico": "^MXX",
    "Egypt": "^EGX30",
    "Vietnam": "^VNINDEX",
    "Philippines": "^PSEI",
    "Russia": "IMOEX.ME",
    "Saudi Arabia": "TASI.SR",
    # Add more mappings as needed
}

# Map country names to commodity symbols if relevant
COUNTRY_COMMODITY_DEPENDENCE = {
    "Saudi Arabia": "CL=F",  # Crude Oil Futures
    "Russia": "CL=F",
    "Nigeria": "CL=F",
    "Australia": "GC=F",  # Gold Futures
    "South Africa": "GC=F",
    # Add more mappings as needed
}


def get_country_metrics(country_name: str) -> Dict[str, Any]:
    """
    Fetches all indicators for a given country and calculates derivative metrics.
    This function is now cached with a time limit specified in the config settings.

    Args:
        country_name (str): The name of the country.

    Returns:
        Dict[str, Any]: A dictionary containing the indicator data.
    """
    country_code = COUNTRY_NAME_TO_ISO2.get(country_name)
    if not country_code:
        raise ValueError(f"Country code for {country_name} not found.")

    metrics = {}
    # Fetch World Bank indicators
    for metric_name, indicator_code in INDICATORS.items():
        try:
            data = fetch_indicator_data(country_code, indicator_code)
            # Process data to get time series
            processed_data = []
            for entry in data:
                if entry['value'] is not None:
                    processed_data.append({
                        'date': entry['date'],
                        'value': entry['value']
                    })
            # Reverse the list to have chronological order
            metrics[metric_name] = processed_data[::-1]
            logger.info(f"Successfully calculated metric: {metric_name}")
        except Exception as e:
            logger.error(
                f"Error calculating metric {metric_name} for {country_name}: {e}")
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

    # Fetch commodity prices if the country is commodity-dependent
    commodity_symbol = COUNTRY_COMMODITY_DEPENDENCE.get(country_name)
    if commodity_symbol:
        commodity_price_data = fetch_commodity_price(commodity_symbol)
        metrics['commodity_price'] = commodity_price_data

    # Calculate derivative metrics
    metrics = calculate_derivative_metrics(metrics, country_name)

    return metrics


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
        "User-Agent": "Mozilla/5.0"
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
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            data_points.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
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
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            data_points.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
                'value': float(row['Close']) if not pd.isnull(row['Close']) else None
            })
        return data_points
    except Exception as e:
        logger.error(f"Error fetching stock index series data: {e}")
        return []


def fetch_commodity_price(commodity_symbol: str) -> List[Dict[str, Any]]:
    """
    Fetches historical commodity price data using yfinance.

    Args:
        commodity_symbol (str): The commodity symbol (e.g., 'CL=F' for Crude Oil Futures).

    Returns:
        List[Dict[str, Any]]: A list of commodity price data points.
    """
    try:
        data = yf.download(commodity_symbol, period='1y', interval='1d')
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            data_points.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
                'value': float(row['Close']) if not pd.isnull(row['Close']) else None
            })
        return data_points
    except Exception as e:
        logger.error(f"Error fetching commodity price data: {e}")
        return []


def calculate_derivative_metrics(metrics: Dict[str, Any], country_name: str) -> Dict[str, Any]:
    """
    Calculates derivative metrics from existing data.

    Args:
        metrics (Dict[str, Any]): The metrics dictionary containing raw data.
        country_name (str): The name of the country.

    Returns:
        Dict[str, Any]: A dictionary with derivative metrics added.
    """
    derivative_metrics = {}

    # Example: Trade Balance = Exports - Imports
    exports = metrics.get('exports_of_goods_and_services', [])
    imports = metrics.get('imports_of_goods_and_services', [])
    trade_balance = []
    if exports and imports:
        exports_df = pd.DataFrame(exports)
        imports_df = pd.DataFrame(imports)
        merged_df = pd.merge(exports_df, imports_df, on='date',
                             suffixes=('_exports', '_imports'))
        merged_df['value'] = merged_df['value_exports'] - \
            merged_df['value_imports']
        trade_balance = merged_df[['date', 'value']].to_dict('records')
    derivative_metrics['trade_balance'] = trade_balance

    # Example: Stock Market Volatility
    stock_index = metrics.get('stock_index', [])
    if stock_index:
        df = pd.DataFrame(stock_index)
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        df['returns'] = df['value'].pct_change()
        volatility = df['returns'].rolling(window=30).std() * np.sqrt(252)
        df['volatility'] = volatility
        volatility_series = df[['date', 'volatility']
                               ].dropna().to_dict('records')
        if volatility_series:
            derivative_metrics['stock_market_volatility'] = [
                {'date': item['date'], 'value': item['volatility']}
                for item in volatility_series
            ]
            logger.info(
                f"Successfully calculated stock market volatility with {len(volatility_series)} data points")
        else:
            logger.warning(
                "Unable to calculate stock market volatility: no data points after processing")

    # Example: Exchange Rate Volatility
    exchange_rate = metrics.get('exchange_rate', [])
    if exchange_rate:
        df = pd.DataFrame(exchange_rate)
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        df['returns'] = df['value'].pct_change()
        volatility = df['returns'].rolling(window=30).std() * np.sqrt(252)
        df['volatility'] = volatility
        volatility_series = df[['date', 'volatility']
                               ].dropna().to_dict('records')
        if volatility_series:
            derivative_metrics['exchange_rate_volatility'] = [
                {'date': item['date'], 'value': item['volatility']}
                for item in volatility_series
            ]
            logger.info(
                f"Successfully calculated exchange rate volatility with {len(volatility_series)} data points")
        else:
            logger.warning(
                "Unable to calculate exchange rate volatility: no data points after processing")

    # Example: Real Effective Exchange Rate (Proxy)
    exchange_rate = metrics.get('exchange_rate', [])
    inflation = metrics.get('inflation', [])
    if exchange_rate and inflation:
        exchange_df = pd.DataFrame(exchange_rate)
        inflation_df = pd.DataFrame(inflation)
        logger.debug(
            f"Exchange rate data points: {len(exchange_df)}, Inflation data points: {len(inflation_df)}")

        # Convert date strings to datetime objects
        exchange_df['date'] = pd.to_datetime(exchange_df['date'])
        inflation_df['date'] = pd.to_datetime(inflation_df['date'])

        # Resample both dataframes to monthly frequency
        exchange_df.set_index('date', inplace=True)
        inflation_df.set_index('date', inplace=True)
        exchange_monthly = exchange_df.resample('M').last()
        inflation_monthly = inflation_df.resample('M').last()

        # Merge the resampled dataframes
        merged_df = pd.merge(exchange_monthly, inflation_monthly, left_index=True,
                             right_index=True, suffixes=('_exchange', '_inflation'))
        logger.debug(f"Merged data points: {len(merged_df)}")

        # Calculate REER
        merged_df['real_exchange_rate'] = merged_df['value_exchange'] / \
            (1 + merged_df['value_inflation']/100)
        merged_df.reset_index(inplace=True)
        reer_series = merged_df[[
            'date', 'real_exchange_rate']].dropna().to_dict('records')

        if reer_series:
            derivative_metrics['real_effective_exchange_rate'] = [
                {'date': item['date'].strftime(
                    '%Y-%m-%d'), 'value': item['real_exchange_rate']}
                for item in reer_series
            ]
            logger.info(
                f"Successfully calculated REER with {len(reer_series)} data points")
        else:
            logger.warning(
                "Unable to calculate REER: no data points after processing")
    else:
        logger.warning(
            f"Unable to calculate REER: missing data (exchange rate: {bool(exchange_rate)}, inflation: {bool(inflation)})")

    # Add more derivative metrics as needed

    for metric_name, metric_data in derivative_metrics.items():
        if metric_data:
            logger.info(
                f"Successfully calculated derivative metric: {metric_name}")
        else:
            logger.warning(
                f"Unable to calculate derivative metric: {metric_name}")

    metrics.update(derivative_metrics)
    return metrics

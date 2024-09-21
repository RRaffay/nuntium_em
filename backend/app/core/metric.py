# core/metric.py

import math
import yfinance as yf
import requests
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List
from requests.exceptions import RequestException, HTTPError
from dotenv import load_dotenv
from config import settings
import json
import os
import traceback
import datetime

load_dotenv()

logger = logging.getLogger(__name__)

WORLD_BANK_API_URL = "https://api.worldbank.org/v2"


def load_json(filename):
    # Get the directory of the current file (metric.py)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Navigate up to the project root
    project_root = os.path.abspath(os.path.join(current_dir, '..'))

    # Construct the path to the data file
    file_path = os.path.join(project_root, 'data_config', filename)

    with open(file_path, 'r') as f:
        return json.load(f)


def load_econdb_tickers(csv_filename):
    # Get the directory of the current file (metric.py)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Navigate up to the project root
    project_root = os.path.abspath(os.path.join(current_dir, '..'))

    # Construct the path to the data file
    file_path = os.path.join(project_root, 'data_config', csv_filename)

    # Read the CSV file
    df = pd.read_csv(file_path)
    return df


def build_country_series_mapping(df):
    country_series_mapping = {}

    for _, row in df.iterrows():
        country = row['entity']
        metric_name = row['description'].lower().replace(' ', '_')
        series_code = row['short_ticker']
        unit = row['scale']  # You might need to adjust this based on the data
        label = row['description']
        source = row['source']
        description = row['description']

        if country not in country_series_mapping:
            country_series_mapping[country] = {}

        country_series_mapping[country][metric_name] = {
            'series_code': series_code,
            'label': label,
            'unit': unit,
            'source': source,
            'description': description
        }

    return country_series_mapping


COUNTRY_NAME_TO_ISO2 = load_json('country_codes.json')
INDICATORS = load_json('world_bank_indicators.json')
CURRENCY_PAIRS = load_json('currency_pairs.json')
STOCK_INDEX_SYMBOLS = load_json('stock_indices_symbols.json')
COUNTRY_COMMODITY_DEPENDENCE = load_json('country_commodity_dependence.json')

# Load Econdb tickers and build the country-series mapping
econdb_df = load_econdb_tickers('main_tickers.csv')
ECONDB_COUNTRY_SERIES_MAPPING = build_country_series_mapping(econdb_df)


def get_country_metrics(country_name: str) -> Dict[str, Any]:
    """
    Fetches all indicators for a given country and calculates derivative metrics.

    Args:
        country_name (str): The name of the country.

    Returns:
        Dict[str, Any]: A dictionary containing the indicator data.
    """
    try:
        country_code = COUNTRY_NAME_TO_ISO2.get(country_name)
        if not country_code:
            raise ValueError(f"Country code for {country_name} not found.")

        metrics = {}
        # Fetch World Bank indicators
        for metric_name, indicator_info in INDICATORS.items():
            try:
                data = fetch_indicator_data(
                    country_code, indicator_info['code'])
                # Process data to get time series
                processed_data = []
                for entry in data:
                    if entry['value'] is not None:
                        processed_data.append({
                            'date': entry['date'],
                            'value': entry['value']
                        })
                # Reverse the list to have chronological order
                metrics[metric_name] = {
                    'data': processed_data[::-1],
                    'label': indicator_info['label'],
                    'unit': indicator_info['unit'],
                    'source': indicator_info.get('source', 'World Bank'),
                    'description': indicator_info.get('description', indicator_info['label'])
                }
                logger.info(f"Successfully fetched metric: {metric_name}")
            except Exception as e:
                logger.error(
                    f"Error fetching metric {metric_name} for {country_name}: {e}")
                metrics[metric_name] = {
                    'data': [],
                    'label': indicator_info['label'],
                    'unit': indicator_info['unit'],
                    'source': indicator_info.get('source', 'World Bank'),
                    'description': indicator_info.get('description', indicator_info['label'])
                }

        # Fetch additional indicators from Econdb
        country_series_codes = ECONDB_COUNTRY_SERIES_MAPPING.get(
            country_name, {})
        for metric_name, metric_info in country_series_codes.items():
            try:
                series_code = metric_info['series_code']
                data = fetch_econdb_data(series_code)
                # Process data to get time series
                processed_data = []
                for entry in data:
                    if entry['value'] is not None:
                        processed_data.append({
                            'date': entry['date'],
                            'value': entry['value']
                        })
                # Reverse the list to have chronological order
                metrics[metric_name] = {
                    'data': processed_data[::-1],
                    'label': metric_info['label'],
                    'unit': metric_info['unit'],
                    'source': metric_info.get('source', 'Econdb'),
                    'description': metric_info.get('description', metric_info['label'])
                }
                logger.info(f"Successfully fetched metric: {metric_name}")
            except Exception as e:
                logger.error(
                    f"Error fetching metric {metric_name} for {country_name}: {e}")
                metrics[metric_name] = {
                    'data': [],
                    'label': metric_info['label'],
                    'unit': metric_info['unit'],
                    'source': metric_info.get('source', 'Econdb'),
                    'description': metric_info.get('description', metric_info['label'])
                }

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

        # Process and format the data
        processed_metrics = process_metrics(metrics)

        return processed_metrics
    except Exception as e:
        logger.error(
            f"Error in get_country_metrics for {country_name}: {str(e)}")
        return {}


def sanitize_data(data):
    if isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(v) for v in data]
    elif isinstance(data, float):
        if not math.isfinite(data):
            return None
        else:
            return float(data)
    elif isinstance(data, (pd.Timestamp, datetime.datetime, datetime.date)):
        return data.strftime('%Y-%m-%d')
    elif isinstance(data, np.number):
        return float(data)
    else:
        return data


def process_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
    processed_metrics = {}
    for metric_name, data in metrics.items():
        processed_data = []
        for point in data['data']:
            # Process date
            date = point.get('date', '')
            if isinstance(date, (pd.Timestamp, datetime.datetime, datetime.date)):
                date = date.strftime('%Y-%m-%d')
            else:
                date = str(date)

            # Process value
            value = point.get('value')
            if value is None or not isinstance(value, (int, float, np.number)) or not math.isfinite(float(value)):
                value = None
            else:
                value = float(value)
                value = round(value, 10)

            processed_data.append({
                'date': date,
                'value': value
            })

        processed_metrics[metric_name] = {
            'data': processed_data,
            'label': data['label'],
            'unit': data['unit'],
            'source': data.get('source', ''),
            'description': data.get('description', '')
        }
    # Sanitize the metric data
    return sanitize_data(processed_metrics)


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


def fetch_econdb_data(series_code: str) -> List[Dict[str, Any]]:
    """
    Fetches data from Econdb API for a given series code.

    Args:
        series_code (str): The Econdb series code.

    Returns:
        List[Dict[str, Any]]: A list of data points.
    """
    api_key = settings.ECONDB_API_KEY
    if not api_key:
        logger.error("Econdb API key is not set.")
        return []
    url = f"https://www.econdb.com/api/series/{series_code}/?format=json&token={api_key}"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        if 'data' in data:
            data_points = []
            dates = data['data']['dates']
            values = data['data']['values']
            for date, value in zip(dates, values):
                data_points.append({
                    'date': date,
                    'value': value
                })
            return data_points
        else:
            return []
    except RequestException as e:
        logger.error(f"Error fetching data from Econdb API: {e}")
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
        return {
            'data': data_points,
            'label': f'Exchange Rate ({currency_pair})',
            'unit': 'Exchange Rate',
            'source': 'Yahoo Finance',
            'description': f'Historical exchange rate data for {currency_pair}'
        }
    except Exception as e:
        logger.error(f"Error fetching exchange rate series data: {e}")
        return {
            'data': [],
            'label': f'Exchange Rate ({currency_pair})',
            'unit': 'Exchange Rate',
            'source': 'Yahoo Finance',
            'description': f'Historical exchange rate data for {currency_pair}'
        }


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
        return {
            'data': data_points,
            'label': f'Stock Index ({symbol})',
            'unit': 'Index Value',
            'source': 'Yahoo Finance',
            'description': f'Historical stock index data for {symbol}'
        }
    except Exception as e:
        logger.error(f"Error fetching stock index series data: {e}")
        return {
            'data': [],
            'label': f'Stock Index ({symbol})',
            'unit': 'Index Value',
            'source': 'Yahoo Finance',
            'description': f'Historical stock index data for {symbol}'
        }


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
        return {
            'data': data_points,
            'label': f'Commodity Price ({commodity_symbol})',
            'unit': 'USD',
            'source': 'Yahoo Finance',
            'description': f'Historical commodity price data for {commodity_symbol}'
        }
    except Exception as e:
        logger.error(f"Error fetching commodity price data: {e}")
        return {
            'data': [],
            'label': f'Commodity Price ({commodity_symbol})',
            'unit': 'USD',
            'source': 'Yahoo Finance',
            'description': f'Historical commodity price data for {commodity_symbol}'
        }


def calculate_derivative_metrics(metrics: Dict[str, Any], country_name: str) -> Dict[str, Any]:
    try:
        derivative_metrics = {}

        # Trade Balance = Exports - Imports
        exports = metrics.get('exports_of_goods_and_services', {})
        imports = metrics.get('imports_of_goods_and_services', {})
        trade_balance = []
        if exports and imports:
            exports_df = pd.DataFrame(exports['data'])
            imports_df = pd.DataFrame(imports['data'])
            merged_df = pd.merge(exports_df, imports_df, on='date',
                                 suffixes=('_exports', '_imports'))
            merged_df['value'] = merged_df['value_exports'] - \
                merged_df['value_imports']
            # Replace NaN values
            merged_df = merged_df.replace({np.nan: None})
            # Ensure dates are strings
            merged_df['date'] = merged_df['date'].apply(lambda x: x.strftime(
                '%Y-%m-%d') if isinstance(x, (pd.Timestamp, datetime.datetime, datetime.date)) else str(x))
            trade_balance = merged_df[['date', 'value']].to_dict('records')
        derivative_metrics['trade_balance'] = {
            'data': trade_balance,
            'label': 'Trade Balance',
            'unit': 'USD',
            'source': 'Calculated',
            'description': 'Trade Balance calculated as Exports minus Imports'
        }

        # Stock market metrics
        stock_market_index = metrics.get('stock_index', {}).get('data', [])
        if stock_market_index:
            df = pd.DataFrame(stock_market_index)
            if 'value' in df.columns:
                df['value'] = pd.to_numeric(df['value'], errors='coerce')
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values('date')

                df['daily_return'] = df['value'].pct_change()
                df['volatility'] = df['daily_return'].rolling(
                    window=30).std() * np.sqrt(252)

                # Replace NaN values
                df = df.replace({np.nan: None})

                current_value = df['value'].iloc[-1] if df['value'].iloc[-1] is not None else None
                year_high = df['value'].max(
                ) if df['value'].max() is not None else None
                year_low = df['value'].min(
                ) if df['value'].min() is not None else None
                volatility = df['volatility'].iloc[-1] if df['volatility'].iloc[-1] is not None else None

                last_date = df['date'].iloc[-1].strftime('%Y-%m-%d')

                derivative_metrics['stock_market_current'] = {
                    'data': [{'date': last_date, 'value': current_value}],
                    'label': 'Current Stock Market Index',
                    'unit': 'Index',
                    'source': 'Calculated from Stock Index',
                    'description': 'Current value of the stock market index'
                }
                derivative_metrics['stock_market_year_high'] = {
                    'data': [{'date': last_date, 'value': year_high}],
                    'label': 'Year High',
                    'unit': 'Index',
                    'source': 'Calculated from Stock Index',
                    'description': 'Highest value of the stock market index over the past year'
                }
                derivative_metrics['stock_market_year_low'] = {
                    'data': [{'date': last_date, 'value': year_low}],
                    'label': 'Year Low',
                    'unit': 'Index',
                    'source': 'Calculated from Stock Index',
                    'description': 'Lowest value of the stock market index over the past year'
                }
                derivative_metrics['stock_market_volatility'] = {
                    'data': [{'date': last_date, 'value': volatility}],
                    'label': 'Stock Market Volatility',
                    'unit': '%',
                    'source': 'Calculated from Stock Index',
                    'description': 'Annualized volatility of the stock market index'
                }

        # Exchange Rate Volatility
        exchange_rate = metrics.get('exchange_rate', {})
        if exchange_rate:
            df = pd.DataFrame(exchange_rate['data'])
            df['value'] = pd.to_numeric(df['value'], errors='coerce')
            df['returns'] = df['value'].pct_change()
            df['volatility'] = df['returns'].rolling(
                window=30).std() * np.sqrt(252)
            # Replace NaN values
            df = df.replace({np.nan: None})
            df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
            volatility_series = df[['date', 'volatility']
                                   ].dropna(subset=['volatility']).to_dict('records')
            if volatility_series:
                derivative_metrics['exchange_rate_volatility'] = {
                    'data': volatility_series,
                    'label': 'Exchange Rate Volatility',
                    'unit': '%',
                    'source': 'Calculated from Exchange Rate',
                    'description': 'Annualized volatility of the exchange rate'
                }

        # Real Interest Rate
        interest_rate = metrics.get('interest_rate', {})
        inflation_rate = metrics.get('inflation', {})
        if interest_rate and inflation_rate and interest_rate.get('data') and inflation_rate.get('data'):
            interest_df = pd.DataFrame(interest_rate['data'])
            inflation_df = pd.DataFrame(inflation_rate['data'])

            if 'date' in interest_df.columns and 'value' in interest_df.columns and \
               'date' in inflation_df.columns and 'value' in inflation_df.columns:
                interest_df['date'] = pd.to_datetime(interest_df['date'])
                inflation_df['date'] = pd.to_datetime(inflation_df['date'])

                merged_df = pd.merge(
                    interest_df, inflation_df, on='date', suffixes=('_interest', '_inflation'))
                merged_df['value'] = merged_df['value_interest'] - \
                    merged_df['value_inflation']
                # Replace NaN values
                merged_df = merged_df.replace({np.nan: None})
                merged_df['date'] = merged_df['date'].dt.strftime('%Y-%m-%d')
                real_interest_rate_series = merged_df[[
                    'date', 'value']].to_dict('records')
                derivative_metrics['real_interest_rate'] = {
                    'data': real_interest_rate_series,
                    'label': 'Real Interest Rate',
                    'unit': '%',
                    'source': 'Calculated from Interest Rate and Inflation',
                    'description': 'Real interest rate calculated as nominal interest rate minus inflation rate'
                }

        metrics.update(derivative_metrics)
        return metrics
    except Exception as e:
        logger.error(f"Error in calculate_derivative_metrics: {str(e)}")
        traceback.print_exc()
        return metrics

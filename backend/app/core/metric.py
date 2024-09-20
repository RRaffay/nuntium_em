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

        if country not in country_series_mapping:
            country_series_mapping[country] = {}

        country_series_mapping[country][metric_name] = {
            'series_code': series_code,
            'label': label,
            'unit': unit
        }

    return country_series_mapping


COUNTRY_NAME_TO_ISO2 = load_json('country_codes.json')
INDICATORS = load_json('world_bank_indicators.json')
CURRENCY_PAIRS = load_json('currency_pairs.json')
STOCK_INDEX_SYMBOLS = load_json('stock_indicies_symbols.json')
COUNTRY_COMMODITY_DEPENDENCE = load_json('country_commodity_dependency.json')

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
                    'unit': indicator_info['unit']
                }
                logger.info(f"Successfully calculated metric: {metric_name}")
            except Exception as e:
                logger.error(
                    f"Error calculating metric {metric_name} for {country_name}: {e}")
                metrics[metric_name] = {
                    'data': [],
                    'label': indicator_info['label'],
                    'unit': indicator_info['unit']
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
                    'unit': metric_info['unit']
                }
                logger.info(f"Successfully fetched metric: {metric_name}")
            except Exception as e:
                logger.error(
                    f"Error fetching metric {metric_name} for {country_name}: {e}")
                metrics[metric_name] = {
                    'data': [],
                    'label': metric_info['label'],
                    'unit': metric_info['unit']
                }

        # Fetch exchange rate data
        currency_pair = CURRENCY_PAIRS.get(country_name)
        if currency_pair:
            exchange_rate_data = fetch_exchange_rate_series(currency_pair)
            metrics['exchange_rate'] = {
                'data': exchange_rate_data,
                'label': 'Exchange Rate',
                'unit': 'USD'
            }

        # Fetch stock index data
        stock_index_symbol = STOCK_INDEX_SYMBOLS.get(country_name)
        if stock_index_symbol:
            stock_index_data = fetch_stock_index_series(stock_index_symbol)
            metrics['stock_index'] = {
                'data': stock_index_data,
                'label': 'Stock Index',
                'unit': 'Index'
            }

        # Fetch commodity prices if the country is commodity-dependent
        commodity_symbol = COUNTRY_COMMODITY_DEPENDENCE.get(country_name)
        if commodity_symbol:
            commodity_price_data = fetch_commodity_price(commodity_symbol)
            metrics['commodity_price'] = {
                'data': commodity_price_data,
                'label': 'Commodity Price',
                'unit': 'USD'
            }

        # Calculate derivative metrics
        metrics = calculate_derivative_metrics(metrics, country_name)

        # Process and format the data
        processed_metrics = process_metrics(metrics)

        return processed_metrics
    except Exception as e:
        logger.error(
            f"Error in get_country_metrics for {country_name}: {str(e)}")
        return {}


def process_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
    processed_metrics = {}
    for metric_name, data in metrics.items():
        processed_data = []
        for point in data['data']:
            if point['value'] is not None:
                processed_data.append({
                    'date': point['date'],
                    'value': float(point['value'])
                })
        processed_metrics[metric_name] = {
            'data': processed_data,
            'label': data['label'],
            'unit': data['unit']
        }
    return processed_metrics


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
    try:
        derivative_metrics = {}

        # Example: Trade Balance = Exports - Imports
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
            trade_balance = merged_df[['date', 'value']].to_dict('records')
        derivative_metrics['trade_balance'] = {
            'data': trade_balance,
            'label': 'Trade Balance',
            'unit': 'USD'
        }

        # Stock market index
        stock_market_index = metrics.get(
            'stock_index', {}).get('data', [])
        if stock_market_index:
            df = pd.DataFrame(stock_market_index)
            if 'value' in df.columns:
                df['value'] = pd.to_numeric(df['value'], errors='coerce')
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values('date')

                # Calculate daily returns
                df['daily_return'] = df['value'].pct_change()

                # Calculate volatility (30-day rolling standard deviation of returns)
                df['volatility'] = df['daily_return'].rolling(
                    window=30).std() * np.sqrt(252)  # Annualized

                # Calculate metrics
                current_value = df['value'].iloc[-1]
                year_high = df['value'].max()
                year_low = df['value'].min()
                volatility = df['volatility'].iloc[-1]

                derivative_metrics['stock_market_current'] = {'data': [{'date': df['date'].iloc[-1].strftime(
                    '%Y-%m-%d'), 'value': current_value}], 'label': 'Current Stock Market Index', 'unit': 'index'}
                derivative_metrics['stock_market_year_high'] = {'data': [
                    {'date': df['date'].iloc[-1].strftime('%Y-%m-%d'), 'value': year_high}], 'label': 'Year High', 'unit': 'index'}
                derivative_metrics['stock_market_year_low'] = {'data': [
                    {'date': df['date'].iloc[-1].strftime('%Y-%m-%d'), 'value': year_low}], 'label': 'Year Low', 'unit': 'index'}
                derivative_metrics['stock_market_volatility'] = {'data': [{'date': df['date'].iloc[-1].strftime(
                    '%Y-%m-%d'), 'value': volatility}], 'label': 'Stock Market Volatility', 'unit': '%'}
            else:
                logger.warning(
                    f"'value' column not found in stock market data for {country_name}")
        else:
            logger.warning(
                f"No stock market data available for {country_name}")

        # Example: Exchange Rate Volatility
        exchange_rate = metrics.get('exchange_rate', {})
        if exchange_rate:
            try:
                df = pd.DataFrame(exchange_rate['data'])
                df['value'] = pd.to_numeric(df['value'], errors='coerce')
                df['returns'] = df['value'].pct_change()
                volatility = df['returns'].rolling(
                    window=30).std() * np.sqrt(252)
                df['volatility'] = volatility
                volatility_series = df[['date', 'volatility']].dropna(
                ).to_dict('records')
                if volatility_series:
                    derivative_metrics['exchange_rate_volatility'] = {
                        'data': [
                            {'date': str(item['date']),
                             'value': item['volatility']}
                            for item in volatility_series
                        ],
                        'label': 'Exchange Rate Volatility',
                        'unit': '%'
                    }
                    logger.info(
                        f"Successfully calculated exchange rate volatility with {len(volatility_series)} data points")
                else:
                    logger.warning(
                        "Unable to calculate exchange rate volatility: no data points after processing")
            except Exception as e:
                logger.error(
                    f"Error calculating exchange rate volatility: {str(e)}")

        # Real Interest Rate
        interest_rate = metrics.get('interest_rate', {})
        inflation_rate = metrics.get('inflation', {})
        if interest_rate and inflation_rate and interest_rate.get('data') and inflation_rate.get('data'):
            try:
                interest_df = pd.DataFrame(interest_rate['data'])
                inflation_df = pd.DataFrame(inflation_rate['data'])

                # Ensure 'date' and 'value' columns exist
                if 'date' in interest_df.columns and 'value' in interest_df.columns and \
                   'date' in inflation_df.columns and 'value' in inflation_df.columns:

                    interest_df['date'] = pd.to_datetime(interest_df['date'])
                    inflation_df['date'] = pd.to_datetime(inflation_df['date'])

                    merged_df = pd.merge(
                        interest_df, inflation_df, on='date', suffixes=('_interest', '_inflation'))
                    merged_df['value'] = merged_df['value_interest'] - \
                        merged_df['value_inflation']
                    real_interest_rate_series = merged_df[[
                        'date', 'value']].to_dict('records')
                    derivative_metrics['real_interest_rate'] = {
                        'data': [
                            {'date': item['date'].strftime(
                                '%Y-%m-%d'), 'value': item['value']}
                            for item in real_interest_rate_series
                        ],
                        'label': 'Real Interest Rate',
                        'unit': '%'
                    }
                    logger.info(
                        f"Successfully calculated real interest rate for {country_name}")
                else:
                    logger.warning(
                        f"Missing required columns for real interest rate calculation for {country_name}")
            except Exception as e:
                logger.error(
                    f"Error calculating real interest rate for {country_name}: {str(e)}")
        else:
            logger.warning(
                f"Insufficient data for real interest rate calculation for {country_name}")

        # Example: Debt to GDP Ratio (if both debt and GDP are available)
        debt_to_gdp = metrics.get('debt_to_gdp', {})
        if debt_to_gdp and 'data' in debt_to_gdp and debt_to_gdp['data']:
            derivative_metrics['debt_to_gdp'] = debt_to_gdp

        # Add more derivative metrics as needed

        for metric_name, metric_data in derivative_metrics.items():
            if metric_data['data']:
                logger.info(
                    f"Successfully calculated derivative metric: {metric_name}")
            else:
                logger.warning(
                    f"Unable to calculate derivative metric: {metric_name}")

        metrics.update(derivative_metrics)
        return metrics
    except Exception as e:
        logger.error(
            f"Error calculating derivative metrics for {country_name}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return metrics

# app/core/metric.py

import math
import os
import json
import logging
import traceback
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import traceback
import requests
import pandas as pd
import numpy as np
import yfinance as yf
from requests.exceptions import RequestException
from dotenv import load_dotenv
from pydantic import BaseModel, validator
import time
from requests.exceptions import RequestException, HTTPError

from config import settings

load_dotenv()

logger = logging.getLogger(__name__)

WORLD_BANK_API_URL = "https://api.worldbank.org/v2"


class DataPoint(BaseModel):
    date: date
    value: Optional[float]

    @validator('value')
    def check_value(cls, v):
        if v is not None and not math.isfinite(v):
            return None
        return v

    class Config:
        json_encoders = {
            date: lambda v: v.strftime('%Y-%m-%d'),
        }


class MetricData(BaseModel):
    data: List[DataPoint]
    label: str
    unit: str
    source: str
    description: str

    @validator('label', 'unit', 'source', 'description', pre=True, always=True)
    def validate_string_fields(cls, v):
        if isinstance(v, str):
            return v
        elif v is None or (isinstance(v, float) and math.isnan(v)):
            return ''
        else:
            return str(v)

    class Config:
        json_encoders = {
            date: lambda v: v.strftime('%Y-%m-%d'),
        }


def load_json(filename: str) -> Dict[str, Any]:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..'))
    file_path = os.path.join(project_root, 'data_config', filename)
    with open(file_path, 'r') as f:
        return json.load(f)


def load_econdb_tickers(csv_filename: str) -> pd.DataFrame:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..'))
    file_path = os.path.join(project_root, 'data_config', csv_filename)
    df = pd.read_csv(file_path)
    return df


def build_country_series_mapping(df: pd.DataFrame) -> Dict[str, Any]:
    country_series_mapping = {}
    for _, row in df.iterrows():
        country = row['entity']
        metric_name = row['description'].lower().replace(' ', '_')
        series_code = row['short_ticker']
        unit = row['scale']
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


def get_country_metrics(country_name: str, start_date: str = "1910") -> Dict[str, Any]:
    metrics: Dict[str, MetricData] = {}
    country_code = COUNTRY_NAME_TO_ISO2.get(country_name)
    if not country_code:
        raise ValueError(f"Country code for {country_name} not found.")

    # Fetch World Bank indicators
    for metric_name, indicator_info in INDICATORS.items():
        try:
            data_points = fetch_indicator_data(
                country_code, indicator_info['code'], start_date)
            metric_data = MetricData(
                data=data_points,
                label=indicator_info['label'],
                unit=indicator_info['unit'],
                source=indicator_info.get('source', 'World Bank'),
                description=indicator_info.get(
                    'description', indicator_info['label'])
            )
            metrics[metric_name] = metric_data
            logger.info(f"Successfully fetched metric: {metric_name}")
        except Exception as e:
            logger.error(
                f"Error fetching metric {metric_name} for {country_name}: {e}")
            metrics[metric_name] = MetricData(
                data=[],
                label=indicator_info['label'],
                unit=indicator_info['unit'],
                source=indicator_info.get('source', 'World Bank') or '',
                description=indicator_info.get(
                    'description', indicator_info['label']) or ''
            )

    # Fetch additional indicators from Econdb
    country_series_codes = ECONDB_COUNTRY_SERIES_MAPPING.get(country_name, {})
    for metric_name, metric_info in country_series_codes.items():
        try:
            data_points = fetch_econdb_data(metric_info['series_code'])
            metric_data = MetricData(
                data=data_points,
                label=metric_info['label'],
                unit=metric_info['unit'],
                source=metric_info.get('source', 'Econdb'),
                description=metric_info.get(
                    'description', metric_info['label'])
            )
            metrics[metric_name] = metric_data
            logger.info(f"Successfully fetched metric: {metric_name}")
        except Exception as e:
            logger.error(
                f"Error fetching metric {metric_name} for {country_name}: {e}")
            metrics[metric_name] = MetricData(
                data=[],
                label=metric_info['label'],
                unit=metric_info['unit'],
                source=metric_info.get('source', 'Econdb') or '',
                description=metric_info.get(
                    'description', metric_info['label']) or ''
            )

    # Fetch exchange rate data
    currency_pair = CURRENCY_PAIRS.get(country_name)
    if currency_pair:
        exchange_rate_data = fetch_exchange_rate_series(currency_pair)
        if exchange_rate_data:
            metrics['exchange_rate'] = exchange_rate_data

    # Fetch stock index data
    stock_index_symbol = STOCK_INDEX_SYMBOLS.get(country_name)
    if stock_index_symbol:
        stock_index_data = fetch_stock_index_series(stock_index_symbol)
        if stock_index_data:
            metrics['stock_index'] = stock_index_data

    # Fetch commodity prices if the country is commodity-dependent
    commodity_symbol = COUNTRY_COMMODITY_DEPENDENCE.get(country_name)
    if commodity_symbol:
        commodity_price_data = fetch_commodity_price(commodity_symbol)
        if commodity_price_data:
            metrics['commodity_price'] = commodity_price_data

    # Calculate derivative metrics
    metrics = calculate_derivative_metrics(metrics, country_name)

    # Process and format the data
    processed_metrics = {metric_name: metric_data.dict()
                         for metric_name, metric_data in metrics.items()}

    return processed_metrics


def fetch_indicator_data(country_code: str, indicator_code: str, start_date: str = "2000") -> List[DataPoint]:
    base_url = f"{WORLD_BANK_API_URL}/country/{country_code}/indicator/{indicator_code}"
    params = {
        "format": "json",
        "per_page": 1000,
        "date": f"{start_date}:{datetime.now().year}"
    }
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    all_data = []

    try:
        while True:
            response = requests.get(
                base_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            if len(data) < 2 or not data[1]:
                break

            for entry in data[1]:
                if entry['value'] is not None:
                    try:
                        date_obj = datetime.strptime(entry['date'], '%Y')
                        date_val = date_obj.date()
                    except ValueError:
                        date_val = datetime.strptime(
                            entry['date'], '%Y-%m-%d').date()
                    value = float(entry['value'])
                    data_point = DataPoint(date=date_val, value=value)
                    all_data.append(data_point)

            if len(data[1]) < params['per_page']:
                break

            params['page'] = data[0]['page'] + 1

        # Sort in chronological order
        return sorted(all_data, key=lambda x: x.date)

    except RequestException as e:
        logger.error(f"Error fetching data from World Bank API: {e}")
        return []
    except Exception as e:
        logger.error(f"General error in fetch_indicator_data: {e}")
        return []


def fetch_econdb_data(series_code: str, max_retries: int = 3, retry_delay: int = 5) -> List[DataPoint]:
    api_key = settings.ECONDB_API_KEY
    if not api_key:
        logger.error("Econdb API key is not set.")
        return []
    url = f"https://www.econdb.com/api/series/{series_code}/?format=json&token={api_key}"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'data' in data:
                data_points = []
                dates = data['data']['dates']
                values = data['data']['values']
                for date_str, value in zip(dates, values):
                    date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
                    data_point = DataPoint(date=date_val, value=value)
                    data_points.append(data_point)
                return data_points
            else:
                return []
        except HTTPError as e:
            if e.response.status_code == 429:
                logger.warning(
                    f"Rate limit exceeded for Econdb API. Retrying {series_code} in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"HTTP error occurred: {e}")
                return []
        except RequestException as e:
            logger.error(f"Error fetching data from Econdb API: {e}")
            return []
        except Exception as e:
            logger.error(f"General error in fetch_econdb_data: {e}")
            return []

    logger.error(f"Failed to fetch data after {max_retries} attempts")
    return []


def fetch_exchange_rate_series(currency_pair: str) -> Optional[MetricData]:
    try:
        data = yf.download(currency_pair, period='1y', interval='1d')
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            date_val = row['Date'].date()
            value = float(row['Close']) if not pd.isnull(
                row['Close']) else None
            data_point = DataPoint(date=date_val, value=value)
            data_points.append(data_point)
        return MetricData(
            data=data_points,
            label=f'Exchange Rate ({currency_pair})',
            unit='Exchange Rate',
            source='Yahoo Finance',
            description=f'Historical exchange rate data for {currency_pair}'
        )
    except Exception as e:
        logger.error(f"Error fetching exchange rate series data: {e}")
        return None


def fetch_stock_index_series(symbol: str) -> Optional[MetricData]:
    try:
        data = yf.download(symbol, period='1y', interval='1d')
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            date_val = row['Date'].date()
            value = float(row['Close']) if not pd.isnull(
                row['Close']) else None
            data_point = DataPoint(date=date_val, value=value)
            data_points.append(data_point)
        return MetricData(
            data=data_points,
            label=f'Stock Index ({symbol})',
            unit='Index Value',
            source='Yahoo Finance',
            description=f'Historical stock index data for {symbol}'
        )
    except Exception as e:
        logger.error(f"Error fetching stock index series data: {e}")
        return None


def fetch_commodity_price(commodity_symbol: str) -> Optional[MetricData]:
    try:
        data = yf.download(commodity_symbol, period='1y', interval='1d')
        data.reset_index(inplace=True)
        data_points = []
        for index, row in data.iterrows():
            date_val = row['Date'].date()
            value = float(row['Close']) if not pd.isnull(
                row['Close']) else None
            data_point = DataPoint(date=date_val, value=value)
            data_points.append(data_point)
        return MetricData(
            data=data_points,
            label=f'Commodity Price ({commodity_symbol})',
            unit='USD',
            source='Yahoo Finance',
            description=f'Historical commodity price data for {commodity_symbol}'
        )
    except Exception as e:
        logger.error(f"Error fetching commodity price data: {e}")
        return None


def calculate_derivative_metrics(metrics: Dict[str, MetricData], country_name: str) -> Dict[str, MetricData]:
    try:
        derivative_metrics = {}

        # Trade Balance = Exports - Imports
        exports = metrics.get('exports_of_goods_and_services')
        imports = metrics.get('imports_of_goods_and_services')
        if exports and imports and exports.data and imports.data:
            exports_df = pd.DataFrame([dp.dict() for dp in exports.data])
            imports_df = pd.DataFrame([dp.dict() for dp in imports.data])
            merged_df = pd.merge(exports_df, imports_df,
                                 on='date', suffixes=('_exports', '_imports'))
            merged_df['value'] = merged_df['value_exports'] - \
                merged_df['value_imports']
            merged_df['date'] = pd.to_datetime(merged_df['date']).dt.date
            merged_df = merged_df.replace({np.nan: None})
            trade_balance_data = [
                DataPoint(date=row['date'], value=row['value'])
                for index, row in merged_df.iterrows()
            ]
            derivative_metrics['trade_balance'] = MetricData(
                data=trade_balance_data,
                label='Trade Balance',
                unit='USD',
                source='Calculated',
                description='Trade Balance calculated as Exports minus Imports'
            )

        # Additional derivative metrics can be calculated similarly...

        metrics.update(derivative_metrics)
        return metrics
    except Exception as e:
        logger.error(f"Error in calculate_derivative_metrics: {str(e)}")
        traceback.print_exc()
        return metrics

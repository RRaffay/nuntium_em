import os
import pickle
from datetime import datetime
import pandas as pd
from google.cloud import bigquery
from .config import Config
# Set up logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fetch_gdelt_data(client: bigquery.Client, country: str, hours: int, config: Config, use_cache: bool = False) -> pd.DataFrame:
    """
    Fetch GDELT data from BigQuery for a specific country and time range, using both Events and GKG tables.
    Performs the join in BigQuery.
    """
    if use_cache:
        cache_file = os.path.join(config.gdelt_cache_dir,
                                  f"{country}_{hours}hours.pkl")

        # Check if cached data exists and is not expired
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                cache_time, df = pickle.load(f)
            if datetime.now() - cache_time <= config.gdelt_cache_expiry:
                logger.info(f"Using cached data from {cache_time}.")
                return df

    try:
        query = f"""
            WITH events AS (
        SELECT
            GlobalEventID,
            DATEADDED,
            SQLDATE,
            Actor1Name,
            Actor2Name,
            IsRootEvent,
            EventCode,
            EventBaseCode,
            EventRootCode,
            QuadClass,
            GoldsteinScale,
            NumMentions,
            NumSources,
            NumArticles,
            AvgTone,
            Actor1Geo_CountryCode,
            Actor2Geo_CountryCode,
            ActionGeo_CountryCode,
            SOURCEURL
        FROM
            `gdelt-bq.gdeltv2.events_partitioned`
        WHERE
            _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 25 HOUR)
            AND DATEADDED >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {hours} HOUR)) AS INT64)
            AND (Actor1Geo_CountryCode = '{country}' OR Actor2Geo_CountryCode = '{country}' OR ActionGeo_CountryCode = '{country}')
    ),
    gkg AS (
        SELECT
            GKGRECORDID,
            DATE,
            SourceCommonName,
            DocumentIdentifier,
            V2Themes,
            V2Locations,
            V2Persons,
            V2Organizations,
            V2Tone,
            GCAM,
            AllNames,
            Amounts,
            TranslationInfo,
            Extras
        FROM
            `gdelt-bq.gdeltv2.gkg_partitioned`
        WHERE
            _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 25 HOUR)
            AND DATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {hours} HOUR)) AS INT64)
    )
    SELECT
        e.*,
        g.GKGRECORDID,
        g.DATE AS GKG_DATE,
        g.SourceCommonName,
        g.V2Themes,
        g.V2Locations,
        g.V2Persons,
        g.V2Organizations,
        g.V2Tone,
        g.GCAM,
        g.AllNames,
        g.Amounts,
        g.TranslationInfo,
        g.Extras
    FROM
        events e
    INNER JOIN
        gkg g
                ON
                    e.SOURCEURL = g.DocumentIdentifier
                """

        # Run the query
        job_config = bigquery.QueryJobConfig(use_query_cache=True)
        query_job = client.query(query, job_config=job_config)
        merged_df = query_job.to_dataframe()

        # Convert DATE columns to datetime
        merged_df['SQLDATE'] = pd.to_datetime(
            merged_df['SQLDATE'], format='%Y%m%d')
        merged_df['GKG_DATE'] = pd.to_datetime(
            merged_df['GKG_DATE'], format='%Y%m%d%H%M%S')
        logging.info(f"Fetched {len(merged_df)} rows of data.")

        if use_cache:
            with open(cache_file, 'wb') as f:
                pickle.dump((datetime.now(), merged_df), f)

        return merged_df

    except Exception as e:
        raise ValueError(f"Error fetching data from BigQuery: {str(e)}")

import os
import logging
from typing import List, Tuple, Dict
import numpy as np
from openai import OpenAI
from google.cloud import bigquery
from google.auth import default
from dotenv import load_dotenv
import pandas as pd
import json
from tqdm import tqdm
import concurrent.futures
from pymongo import MongoClient


from .config import Config
from .data_fetcher import fetch_gdelt_data
from .preprocessor import preprocess_data_summary
from .embeddings import get_embedding, generate_embeddings
from .clustering import cluster_embeddings, optimize_clustering
from .matching import match_clusters
from .cluster_summarizer import generate_cluster_summary
from .article_summarizer import generate_summaries
from .utils import get_country_name
from .sampling import sample_data, sample_articles


class GDELTNewsPipeline:
    def __init__(self, config: Config):
        # Load environment variables
        load_dotenv()

        # Set Google credentials and USER_AGENT
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.getenv(
            'GOOGLE_APPLICATION_CREDENTIALS')
        os.environ['USER_AGENT'] = os.getenv(
            'USER_AGENT', 'EMNewsAnalysis/1.0')

        self.config = config
        self.bigquery_client = bigquery.Client()
        os.makedirs(self.config.gdelt_cache_dir, exist_ok=True)

        # Add a directory for exporting CSV files
        self.export_dir = os.path.join(os.getcwd(), 'exported_data')
        os.makedirs(self.export_dir, exist_ok=True)

        # Set up MongoDB connection
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        self.mongo_client = MongoClient(mongo_uri)
        self.mongo_db = self.mongo_client['gdelt_news']

        # Set up logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def sample_data(self, df: pd.DataFrame, process_all: bool, sample_size: int) -> pd.DataFrame:
        return sample_data(df, process_all, sample_size)

    def run_pipeline(
        self,
        input_sentence: str,
        country: str,
        hours: int,
        article_summarizer_objective: str,
        cluster_summarizer_objective: str,
        process_all: bool = False,
        sample_size: int = 1500,
        max_workers_embeddings: int = 5,
        max_workers_summaries: int = 3,
        export_to_local: bool = False,
        user_id: str = None
    ) -> List[str]:
        try:
            self.logger.info("Fetching GDELT data...")
            raw_data = fetch_gdelt_data(
                self.bigquery_client, country, hours, self.config)
            self.logger.info(f"Fetched {len(raw_data)} rows of data.")

            if raw_data.empty:
                self.logger.warning(
                    "No data fetched from GDELT. Returning empty result.")
                return []

            self.logger.info("Preprocessing data...")
            preprocessed_data = preprocess_data_summary(raw_data)
            self.logger.info(
                f"Preprocessed data shape: {preprocessed_data.shape}")

            self.logger.info("Sampling data...")
            sampled_data = self.sample_data(
                preprocessed_data, process_all, sample_size)
            self.logger.info(f"Sampled data shape: {sampled_data.shape}")

            self.logger.info("Generating embeddings...")
            embeddings, valid_indices = generate_embeddings(
                sampled_data, max_workers=max_workers_embeddings)

            self.logger.info(f"Generated embeddings shape: {embeddings.shape}")
            self.logger.info(f"Number of valid indices: {len(valid_indices)}")

            if embeddings.size == 0:
                self.logger.warning(
                    "No embeddings generated. Returning empty result.")
                return []

            # Check if valid_indices matches the number of rows in sampled_data
            if len(valid_indices) != len(sampled_data):
                self.logger.warning(
                    f"Mismatch between valid indices ({len(valid_indices)}) and sampled data rows ({len(sampled_data)}). Adjusting sampled data.")

                # Create a boolean mask for valid indices
                mask = pd.Series(False, index=range(len(sampled_data)))
                mask.iloc[valid_indices] = True

                # Apply the mask to sampled_data
                sampled_data = sampled_data[mask].reset_index(drop=True)

                self.logger.info(
                    f"Adjusted sampled data shape: {sampled_data.shape}")

            if len(sampled_data) == 0:
                self.logger.warning(
                    "No valid data after filtering. Returning empty result.")
                return []

            self.logger.info("Generating input embedding...")
            input_embedding = self.get_embedding(input_sentence)
            input_embedding = np.array(input_embedding)

            self.logger.info("Optimizing clustering parameters...")
            # Simplified parameter grid focusing on key hyperparameters
            param_grid = {
                'n_components': [5, 20, 50, 70],
                'min_cluster_size': [3, 5, 10],
                'min_samples': [1, 3, 5],
                # Fixed parameters
                'reduce_dimensionality': [True],
                'reducer_algorithm': ['umap'],
                'metric': ['euclidean'],
                'cluster_selection_epsilon': [0.0],
            }

            clusters, best_params = optimize_clustering(
                embeddings=embeddings,
                param_grid=param_grid,
                input_embedding=input_embedding
            )

            self.logger.info(f"Best clustering parameters: {best_params}")
            num_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
            self.logger.info(f"Generated {num_clusters} clusters.")

            sampled_data['cluster'] = clusters

            # self.logger.info("Enriching user input...")
            # enriched_input = enrich_user_interest(input_sentence)
            # self.logger.info(f"Enriched input: {enriched_input}")

            # self.logger.info("Generating input embedding...")
            # input_embedding = self.get_embedding(enriched_input)

            self.logger.info("Matching clusters...")
            matched_clusters = match_clusters(
                input_embedding, embeddings, clusters, self.config.top_n_clusters)
            self.logger.info(f"Matched {len(matched_clusters)} clusters.")

            # Create a dictionary mapping cluster to rank
            cluster_ranks = {cluster: rank for rank,
                             cluster in enumerate(matched_clusters, 1)}

            # Add a column for cluster rank (use -1 for unmatched clusters)
            sampled_data['cluster_rank'] = sampled_data['cluster'].map(
                lambda x: cluster_ranks.get(x, -1))

            # Add a column to indicate matched clusters
            sampled_data['matched_cluster'] = sampled_data['cluster'].isin(
                matched_clusters)

            cluster_summaries = []

            # Additional metadata for exporting
            no_clusters = len(set(clusters))
            no_matched_clusters = len(matched_clusters)
            no_articles = len(sampled_data)

            cluster_article_summaries = {

                'metadata': {
                    'input_sentence': input_sentence,
                    'country': country,
                    'country_name': get_country_name(country),
                    'hours': hours,
                    'cluster_summarizer_objective': cluster_summarizer_objective,
                    'no_clusters': no_clusters,
                    'no_matched_clusters': no_matched_clusters,
                    'no_articles': no_articles,
                    'no_financially_relevant_events': 0
                }
            }

            def process_cluster(cluster):
                cluster_indices = np.where(
                    sampled_data['cluster'] == cluster)[0]
                cluster_data = sampled_data.loc[sampled_data['cluster'] == cluster]
                cluster_urls = cluster_data['SOURCEURL'].tolist()
                cluster_embeddings = embeddings[cluster_indices]

                if not cluster_urls:
                    self.logger.info(f"Skipping empty cluster {cluster}")
                    return None

                # Fetch additional article metadata
                articles_metadata = cluster_data[[
                    'SOURCEURL', 'SQLDATE', 'AvgTone', 'NumMentions', 'GoldsteinScale']]

                sampled_urls = sample_articles(
                    urls=cluster_urls,
                    cluster_embeddings=cluster_embeddings,
                    articles_metadata=articles_metadata,
                    max_articles=self.config.max_articles_per_cluster,
                    lambda_param=self.config.mmr_lambda_param
                )

                self.logger.info(
                    f"Generating summaries for {len(sampled_urls)} articles in cluster {cluster}..."
                )

                article_summaries = generate_summaries(
                    sampled_urls, article_summarizer_objective
                )

                # Filter out articles with summaries marked as "NOT_RELEVANT"
                filtered_summaries = [
                    summary for summary in article_summaries if "NOT_RELEVANT" not in summary
                ]
                filtered_urls = [
                    url for summary, url in zip(article_summaries, sampled_urls) if "NOT_RELEVANT" not in summary
                ]

                if not filtered_summaries:
                    self.logger.info(
                        f"No relevant articles in cluster {cluster}")
                    return None

                event_obj = generate_cluster_summary(
                    filtered_summaries, cluster_summarizer_objective
                )
                return cluster, event_obj, filtered_summaries, filtered_urls

            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers_summaries) as executor:
                future_to_cluster = {executor.submit(
                    process_cluster, cluster): cluster for cluster in matched_clusters}
                for future in tqdm(concurrent.futures.as_completed(future_to_cluster), total=len(matched_clusters), desc="Summarizing clusters"):
                    cluster = future_to_cluster[future]
                    try:
                        result = future.result()
                        if result:
                            cluster, event_obj, article_summaries, sampled_urls = result
                            cluster_summaries.append(event_obj.summary)
                            cluster_article_summaries[cluster] = {
                                'event_title': event_obj.title,
                                'event_relevant_for_financial_analysis': event_obj.relevant_for_financial_analysis,
                                'event_relevance_score': event_obj.relevance_score,
                                'event_summary': event_obj.summary,
                                'article_summaries': article_summaries,
                                'article_urls': sampled_urls
                            }
                            # Increment the counter if the event is financially relevant
                            if event_obj.relevant_for_financial_analysis:
                                cluster_article_summaries['metadata']['no_financially_relevant_events'] += 1
                    except Exception as e:
                        self.logger.error(
                            f"Error processing cluster {cluster}: {str(e)}")

            self.logger.info(
                f"Generated {len(cluster_summaries)} cluster summaries.")

            # Export the DataFrame and summaries
            if export_to_local:
                csv_path, json_path = self.export_data_local(
                    sampled_data, cluster_article_summaries, input_sentence, country, hours
                )
                self.logger.info(f"Exported processed data to {csv_path}")
                self.logger.info(f"Exported summaries to {json_path}")
            else:
                mongo_id = self.export_data_mongo(
                    sampled_data, cluster_article_summaries, input_sentence, country, hours, user_id
                )
                self.logger.info(
                    f"Exported data to MongoDB with ID: {mongo_id}")

            # Return metadata of run
            run_information = {
                'input_sentence': input_sentence,
                'country': country,
                'country_name': get_country_name(country),
                'hours': hours,
                'cluster_summarizer_objective': cluster_summarizer_objective,
                'no_clusters': no_clusters,
                'no_matched_clusters': no_matched_clusters,
                'no_articles': no_articles,
                'no_financially_relevant_events': cluster_article_summaries['metadata']['no_financially_relevant_events']
            }

            return run_information

        except ValueError as ve:
            self.logger.error(
                f"Value error in pipeline: {str(ve)}", exc_info=True)
            raise
        except TypeError as te:
            self.logger.error(
                f"Type error in pipeline: {str(te)}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(
                f"Unexpected error in pipeline: {str(e)}", exc_info=True)
            raise ValueError("Pipeline execution failed") from e

    def get_embedding(self, text: str) -> List[float]:
        return get_embedding(text=text, model=self.config.embedding_model)

    def export_data_local(self, df: pd.DataFrame, summaries: Dict, input_sentence: str, country: str, hours: int) -> Tuple[str, str]:
        """
        Export the processed DataFrame to a CSV file and summaries to a JSON file locally.
        """
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        csv_filename = f"gdelt_data_{country}_{hours}h_{timestamp}.csv"
        json_filename = f"summaries_{country}_{hours}h_{timestamp}.json"

        csv_filepath = os.path.join(self.export_dir, csv_filename)
        json_filepath = os.path.join(self.export_dir, json_filename)

        df.to_csv(csv_filepath, index=False)

        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(summaries, f, ensure_ascii=False, indent=4)

        return csv_filepath, json_filepath

    def export_data_mongo(self, df: pd.DataFrame, summaries: Dict, input_sentence: str, country: str, hours: int, user_id: str) -> str:
        """
        Export the processed DataFrame and summaries to MongoDB.
        """
        try:
            mongo_collection = self.mongo_db['news_summaries']
            timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
            mongo_data = {
                'timestamp': timestamp,
                'input_sentence': input_sentence,
                'country': country,
                'hours': hours,
                'summaries': self._convert_keys_to_strings(summaries),
                'user_id': user_id
            }
            result = mongo_collection.insert_one(mongo_data)
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to save data to MongoDB: {str(e)}")
            raise

    def _convert_keys_to_strings(self, obj):
        """
        Recursively convert all keys in a dictionary to strings.
        """
        if isinstance(obj, dict):
            return {str(key): self._convert_keys_to_strings(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_keys_to_strings(item) for item in obj]
        else:
            return obj

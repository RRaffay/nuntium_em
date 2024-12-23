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
import time


from .config import BaseConfig
from .data_fetcher import fetch_gdelt_data
from .preprocessor import preprocess_data_summary
from .embeddings import get_embedding, generate_embeddings
from .clustering import cluster_embeddings, optimize_clustering
from .matching import match_clusters
from .cluster_summarizer import generate_cluster_summary
from .article_summarizer import generate_summaries
from .utils import get_country_name
from .sampling import sample_data, sample_articles
from .models import Metadata, ClusterSummary, ClusterArticleSummaries, PydanticEncoder, ClusteringScores


class GDELTNewsPipeline:
    def __init__(self, config: BaseConfig):
        """
        Initialize the GDELTNewsPipeline.

        Args:
            config (BaseConfig): Configuration object containing pipeline settings.
        """
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
        os.makedirs(self.config.embeddings_dir, exist_ok=True)

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
        """
        Sample data from the input DataFrame.

        Args:
            df (pd.DataFrame): Input DataFrame to sample from.
            process_all (bool): If True, process all data. If False, sample the data.
            sample_size (int): Number of samples to take if not processing all data.

        Returns:
            pd.DataFrame: Sampled DataFrame.
        """
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
        """
        Run the GDELT news analysis pipeline.

        Args:
            input_sentence (str): User's input sentence for analysis.
            country (str): Country code for news filtering.
            hours (int): Number of hours to look back for news articles.
            article_summarizer_objective (str): Objective for summarizing individual articles.
            cluster_summarizer_objective (str): Objective for summarizing clusters.
            process_all (bool, optional): If True, process all data. Defaults to False.
            sample_size (int, optional): Number of samples to take if not processing all data. Defaults to 1500.
            max_workers_embeddings (int, optional): Maximum number of workers for generating embeddings. Defaults to 5.
            max_workers_summaries (int, optional): Maximum number of workers for generating summaries. Defaults to 3.
            export_to_local (bool, optional): If True, export data locally. Defaults to False.
            user_id (str, optional): User ID for data association. Defaults to None.

        Returns:
            List[str]: Information about the pipeline run.
        """
        start_time = time.time()
        try:
            self.logger.info("Fetching GDELT data...")
            raw_data = fetch_gdelt_data(
                client=self.bigquery_client,
                country=country,
                hours=hours,
                config=self.config,
            )
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
            sampled_data.reset_index(drop=True, inplace=True)

            # Define paths to save embeddings
            embeddings_filename = f"embeddings_{country}_{hours}h.npy"
            embeddings_filepath = os.path.join(
                self.config.embeddings_dir, embeddings_filename)

            indices_filename = f"embedding_indices_{country}_{hours}h.npy"
            indices_filepath = os.path.join(
                self.config.embeddings_dir, indices_filename)

            # Define path to save input embedding
            input_embedding_filename = f"input_embedding_{country}_{hours}h.npy"
            input_embedding_filepath = os.path.join(
                self.config.embeddings_dir, input_embedding_filename)

            self.logger.info("Generating input embedding...")
            input_embedding = self.get_embedding(input_sentence)
            input_embedding = np.array(input_embedding)

            # Save input embedding
            if self.config.save_embeddings:
                np.save(input_embedding_filepath, input_embedding)
                self.logger.info(
                    f"Input embedding saved to {input_embedding_filepath}")

            self.logger.info("Generating embeddings...")
            embeddings, valid_indices = generate_embeddings(
                sampled_data,
                max_workers=max_workers_embeddings,
                save_embeddings_path=embeddings_filepath if self.config.save_embeddings else None,
                save_indices_path=indices_filepath if self.config.save_embeddings else None
            )
            self.logger.info(f"Generated embeddings shape: {embeddings.shape}")
            self.logger.info(f"Number of valid indices: {len(valid_indices)}")

            if embeddings.size == 0:
                self.logger.warning(
                    "No embeddings generated. Returning empty result.")
                return []

            # Filter sampled_data to keep only rows with valid embeddings
            sampled_data = sampled_data.loc[valid_indices].reset_index(
                drop=True)
            self.logger.info(
                f"Filtered sampled data shape: {sampled_data.shape}")

            self.logger.info("Optimizing clustering parameters...")
            param_grid = {
                'reduce_dimensionality': [True, False],
                'reducer_algorithm': ['umap', 'pca', 'none'],
                'n_components': [50, 100],
                'min_cluster_size': [3, 4, 5],
                'min_samples': [1, 2, 3],
                'cluster_selection_epsilon': [0.0, 0.1, 0.2],
                'metric': ['euclidean'],
            }

            clusters, best_params, best_scores, noise_count = optimize_clustering(
                embeddings=embeddings,
                param_grid=param_grid,
                input_embedding=input_embedding
            )

            self.logger.info(f"Best clustering parameters: {best_params}")
            self.logger.info(f"Best scores by component: {best_scores}")
            num_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
            self.logger.info(f"Generated {num_clusters} clusters.")
            self.logger.info(
                f"Number of articles in noise cluster: {noise_count}")

            sampled_data['cluster'] = clusters

            # self.logger.info("Enriching user input...")
            # enriched_input = enrich_user_interest(input_sentence)
            # self.logger.info(f"Enriched input: {enriched_input}")

            # self.logger.info("Generating input embedding...")
            # input_embedding = self.get_embedding(enriched_input)

            self.logger.info("Matching clusters...")
            matched_clusters = match_clusters(
                input_embedding=input_embedding,
                embeddings=embeddings,
                clusters=clusters,
                top_n=self.config.top_n_clusters,
                similarity_threshold=self.config.similarity_threshold,
                diversity_weight=self.config.diversity_weight
            )
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

            metadata = Metadata(
                input_sentence=input_sentence,
                country=country,
                country_name=get_country_name(country),
                hours=hours,
                cluster_summarizer_objective=cluster_summarizer_objective,
                no_clusters=no_clusters,
                no_matched_clusters=no_matched_clusters,
                no_articles=no_articles,
                no_financially_relevant_events=0,
                optimal_clustering_params=best_params,
                clustering_scores=ClusteringScores(**best_scores),
                config_values={
                    "embedding_model": self.config.embedding_model,
                    "max_articles_per_cluster": self.config.max_articles_per_cluster,
                    "mmr_lambda_param": self.config.mmr_lambda_param,
                    "top_n_clusters": self.config.top_n_clusters,
                    "similarity_threshold": self.config.similarity_threshold,
                    "diversity_weight": self.config.diversity_weight,
                },
                total_embeddings_generated=len(embeddings),
                embedding_model=self.config.embedding_model,
                reducer_algorithm=best_params.get('reducer_algorithm', 'none'),
                sampling_method="MMR-based sampling",
                execution_time=time.time() - start_time,
                no_articles_in_noise_cluster=noise_count
            )

            # Initialize ClusterArticleSummaries
            cluster_article_summaries = ClusterArticleSummaries(
                metadata=metadata)

            def process_cluster(cluster):
                cluster_data = sampled_data[sampled_data['cluster'] == cluster].copy(
                )
                cluster_urls = cluster_data['SOURCEURL'].tolist()
                cluster_indices = cluster_data.index
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

                # Mark sampled articles in the cluster data
                cluster_data['sampled'] = cluster_data['SOURCEURL'].isin(
                    sampled_urls)

                self.logger.info(
                    f"Generating summaries for {len(sampled_urls)} articles in cluster {cluster}..."
                )

                article_summaries = generate_summaries(
                    sampled_urls, article_summarizer_objective
                )

                # Filter out articles with summaries marked as "NOT_RELEVANT" or "INACCESSIBLE"
                filtered_summaries = [
                    summary for summary in article_summaries if "NOT_RELEVANT" not in summary and "INACCESSIBLE" not in summary
                ]
                filtered_urls = [
                    url for summary, url in zip(article_summaries, sampled_urls) if "NOT_RELEVANT" not in summary and "INACCESSIBLE" not in summary
                ]

                # Mark read articles in the cluster data
                cluster_data['read'] = cluster_data['SOURCEURL'].isin(
                    filtered_urls)

                # Update the main sampled_data DataFrame
                sampled_data.loc[cluster_indices, ['sampled',
                                                   'read']] = cluster_data[['sampled', 'read']]

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
                            cluster_id, event_obj, article_summaries, sampled_urls = result
                            cluster_summaries.append(event_obj.summary)

                            # Create ClusterSummary object
                            cluster_summary = ClusterSummary(
                                event_title=event_obj.title,
                                event_relevance_rationale=event_obj.relevance_rationale,
                                event_relevance_score=event_obj.relevance_score,
                                event_summary=event_obj.summary,
                                article_summaries=article_summaries,
                                article_urls=sampled_urls
                            )

                            # Add cluster summary to ClusterArticleSummaries
                            cluster_article_summaries.add_cluster_summary(
                                cluster_id, cluster_summary)
                    except Exception as e:
                        self.logger.error(
                            f"Error processing cluster {cluster}: {str(e)}")

            self.logger.info(
                f"Generated {len(cluster_summaries)} cluster summaries.")

            # Before exporting, ensure 'sampled' and 'read' columns exist
            if 'sampled' not in sampled_data.columns:
                sampled_data['sampled'] = False
            if 'read' not in sampled_data.columns:
                sampled_data['read'] = False

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
            run_information = cluster_article_summaries.metadata.model_dump()

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
        """
        Get the embedding for a given text.

        Args:
            text (str): Input text to embed.

        Returns:
            List[float]: Embedding vector.
        """
        return get_embedding(text=text, model=self.config.embedding_model)

    def export_data_local(self, df: pd.DataFrame, summaries: ClusterArticleSummaries, input_sentence: str, country: str, hours: int) -> Tuple[str, str]:
        """
        Export the processed DataFrame to a CSV file and summaries to a JSON file locally.

        Args:
            df (pd.DataFrame): Processed DataFrame to export.
            summaries (ClusterArticleSummaries): Summaries to export.
            input_sentence (str): User's input sentence.
            country (str): Country code.
            hours (int): Number of hours looked back.

        Returns:
            Tuple[str, str]: Paths to the exported CSV and JSON files.
        """
        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        csv_filename = f"gdelt_data_{country}_{hours}h_{timestamp}.csv"
        json_filename = f"summaries_{country}_{hours}h_{timestamp}.json"

        csv_filepath = os.path.join(self.export_dir, csv_filename)
        json_filepath = os.path.join(self.export_dir, json_filename)

        df.to_csv(csv_filepath, index=False)

        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(summaries.model_dump(), f, cls=PydanticEncoder,
                      ensure_ascii=False, indent=4)

        return csv_filepath, json_filepath

    def export_data_mongo(
        self,
        df: pd.DataFrame,
        cluster_article_summaries: ClusterArticleSummaries,
        input_sentence: str,
        country: str,
        hours: int,
        user_id: str
    ) -> str:
        """
        Export the processed DataFrame and summaries to MongoDB.

        Args:
            df (pd.DataFrame): Processed DataFrame to export.
            cluster_article_summaries (ClusterArticleSummaries): Summaries to export.
            input_sentence (str): User's input sentence.
            country (str): Country code.
            hours (int): Number of hours looked back.
            user_id (str): User ID for data association.

        Returns:
            str: ID of the inserted MongoDB document.
        """
        try:
            mongo_collection = self.mongo_db['news_summaries']
            timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
            mongo_data = {
                'timestamp': timestamp,
                'input_sentence': input_sentence,
                'country': country,
                'hours': hours,
                'summaries': cluster_article_summaries.model_dump(),
                'user_id': user_id
            }
            result = mongo_collection.insert_one(mongo_data)
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to save data to MongoDB: {str(e)}")
            raise

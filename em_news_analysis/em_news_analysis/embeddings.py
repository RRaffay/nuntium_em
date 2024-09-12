import time
import concurrent.futures
from typing import List, Tuple, Callable
import numpy as np
import pandas as pd
from tqdm import tqdm
import logging
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_embedding(text: str, model: str) -> List[float]:
    """
    Generate an embedding for a given text using OpenAI's API.
    """
    if not text:
        raise ValueError("Input text cannot be empty")

    try:
        text = text.replace("\n", " ")
        response = OpenAI().embeddings.create(input=[text], model=model)
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {str(e)}")
        raise ValueError(f"Failed to generate embedding: {str(e)}")


def generate_embedding_for_text(args):
    text, get_embedding_func, index = args
    try:
        embedding = get_embedding_func(text)
        return index, embedding
    except Exception as e:
        logger.error(
            f"Failed to generate embedding for index {index}: {str(e)}")
        return index, None


def generate_embeddings(
    df: pd.DataFrame,
    get_embedding_func: Callable[[str], List[float]],
    max_workers: int = 5,
    batch_size: int = 50,
    retry_attempts: int = 3,
    retry_delay: float = 1.0
) -> Tuple[np.ndarray, List[int]]:
    """
    Generate embeddings for the combined text in the dataframe using parallel processing and batching.
    """
    all_embeddings = []
    all_valid_indices = []

    for start_idx in range(0, len(df), batch_size):
        end_idx = min(start_idx + batch_size, len(df))
        batch_df = df.iloc[start_idx:end_idx]

        embeddings = []
        valid_indices = []

        args_list = [(text, get_embedding_func, i, retry_attempts, retry_delay)
                     for i, text in enumerate(batch_df['combined'], start=start_idx)]

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(tqdm(executor.map(generate_embedding_for_text_with_retry, args_list),
                                total=len(args_list),
                                desc=f"Generating embeddings (batch {start_idx//batch_size + 1})"))

        for index, embedding in results:
            if embedding is not None:
                embeddings.append(embedding)
                valid_indices.append(index)

        all_embeddings.extend(embeddings)
        all_valid_indices.extend(valid_indices)

        # Save batch results or perform other operations here if needed
        logger.info(
            f"Completed batch {start_idx//batch_size + 1}. Total embeddings: {len(all_embeddings)}")

        # Add a small delay between batches to avoid rate limiting
        time.sleep(0.5)

    return np.array(all_embeddings), all_valid_indices


def generate_embedding_for_text_with_retry(args):
    text, get_embedding_func, index, max_attempts, delay = args
    for attempt in range(max_attempts):
        try:
            embedding = get_embedding_func(text)
            return index, embedding
        except Exception as e:
            if attempt < max_attempts - 1:
                logger.warning(
                    f"Attempt {attempt + 1} failed for index {index}: {str(e)}. Retrying...")
                time.sleep(delay)
            else:
                logger.error(
                    f"All attempts failed for index {index}: {str(e)}")
                return index, None

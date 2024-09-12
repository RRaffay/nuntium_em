import time
import concurrent.futures
from typing import List, Tuple, Callable
import numpy as np
import pandas as pd
from tqdm import tqdm
import logging
from openai import OpenAI
from functools import partial
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from openai import OpenAI


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI()


def get_embedding(text: str, model: str, client: OpenAI = client) -> List[float]:
    """
    Generate an embedding for a given text using OpenAI's API.
    """
    if not text:
        raise ValueError("Input text cannot be empty")

    try:
        text = text.replace("\n", " ")
        response = client.embeddings.create(input=[text], model=model)
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to generate embedding: {str(e)}")
        return None


def generate_embeddings(
    df: pd.DataFrame,
    max_workers: int = 3,
) -> Tuple[np.ndarray, List[int]]:
    """
    Generate embeddings for the combined text in the dataframe using parallel processing.
    Args:
    - df: Input DataFrame
    - max_workers: Maximum number of worker threads
    Returns:
    - A tuple containing:
      1. A numpy array of embeddings
      2. A list of valid indices
    """
    embeddings = []
    valid_indices = []

    def process_row(index, text):
        try:
            embedding = get_embedding(text, model="text-embedding-3-small")
            embeddings.append(embedding)
            valid_indices.append(index)
        except Exception as e:
            logger.error(
                f"Failed to generate embedding for index {index}: {str(e)}")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        list(tqdm(executor.map(process_row, df.index,
             df['combined']), total=len(df)))

    return np.array(embeddings), valid_indices

from typing import Callable
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


def get_embedding(text: str, model: str = "text-embedding-3-small", embedding_function: Callable = None) -> List[float]:
    """
    Generate an embedding for a given text using the specified embedding function.
    If no function is provided, uses OpenAI's API by default.
    """
    if not text:
        raise ValueError("Input text cannot be empty")

    if embedding_function is None:
        # Default embedding function using OpenAI API
        try:
            text = text.replace("\n", " ")
            response = client.embeddings.create(input=[text], model=model)
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return None
    else:
        # Use the provided embedding function
        return embedding_function(text)


def generate_embeddings(
    df: pd.DataFrame,
    embedding_function: Callable = None,
    max_workers: int = 3,
) -> Tuple[np.ndarray, List[int]]:
    """
    Generate embeddings for the combined text in the dataframe using parallel processing.
    Args:
    - df: Input DataFrame
    - embedding_function: Custom embedding function to generate embeddings.
    - max_workers: Maximum number of worker threads.
    Returns:
    - A tuple containing:
      1. A numpy array of embeddings.
      2. A list of valid indices.
    """
    embeddings = []
    valid_indices = []

    def process_row(index, text):
        try:
            embedding = get_embedding(
                text, embedding_function=embedding_function)
            if embedding is not None:
                embeddings.append(embedding)
                valid_indices.append(index)
        except Exception as e:
            logger.error(
                f"Failed to generate embedding for index {index}: {str(e)}")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        list(tqdm(executor.map(process_row, df.index,
             df['combined']), total=len(df)))

    return np.array(embeddings), valid_indices

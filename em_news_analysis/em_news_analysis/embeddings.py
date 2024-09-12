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
        raise ValueError(f"Failed to generate embedding: {str(e)}")


def generate_embedding_for_text(args):
    text, get_embedding_func, index = args
    try:
        embedding = get_embedding_func(text)
        return index, embedding
    except Exception as e:
        logger.info(
            f"Failed to generate embedding for index {index}: {str(e)}")
        return index, None


def generate_embeddings(
    df: pd.DataFrame,
    get_embedding_func: Callable[[str], List[float]],
    max_workers: int = 5
) -> Tuple[np.ndarray, List[int]]:
    """
    Generate embeddings for the combined text in the dataframe using parallel processing.

    Args:
    - df: Input DataFrame
    - get_embedding_func: Function to get embeddings
    - max_workers: Maximum number of worker threads

    Returns:
    - A tuple containing:
      1. A numpy array of embeddings
      2. A list of valid indices
    """
    embeddings = []
    valid_indices = []

    # Prepare the arguments for parallel processing
    args_list = [(text, get_embedding_func, i)
                 for i, text in enumerate(df['combined'])]

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Use tqdm to show a progress bar
        results = list(tqdm(executor.map(generate_embedding_for_text, args_list), total=len(
            args_list), desc="Generating embeddings"))

    for index, embedding in results:
        if embedding is not None:
            embeddings.append(embedding)
            valid_indices.append(index)

    return np.array(embeddings), valid_indices

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
from em_news_analysis.embeddings import get_embedding, generate_embeddings


@pytest.fixture
def mock_openai():
    with patch('em_news_analysis.embeddings.OpenAI') as mock:
        yield mock


def test_get_embedding(mock_openai):
    mock_openai.return_value.embeddings.create.return_value.data = [
        Mock(embedding=[0.1, 0.2, 0.3])]

    result = get_embedding("Test text", "test-model")

    assert result == [0.1, 0.2, 0.3]
    mock_openai.return_value.embeddings.create.assert_called_once_with(
        input=["Test text"], model="test-model")


def test_get_embedding_empty_input():
    with pytest.raises(ValueError, match="Input text cannot be empty"):
        get_embedding("", "test-model")


def test_generate_embeddings():
    df = pd.DataFrame({
        'combined': ['Text 1', 'Text 2', 'Text 3']
    })

    mock_get_embedding = Mock(side_effect=[[1, 2, 3], [4, 5, 6], [7, 8, 9]])

    embeddings, valid_indices = generate_embeddings(
        df, mock_get_embedding, max_workers=1)

    assert np.array_equal(embeddings, np.array(
        [[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
    assert valid_indices == [0, 1, 2]
    assert mock_get_embedding.call_count == 3


def test_generate_embeddings_with_error():
    df = pd.DataFrame({
        'combined': ['Text 1', 'Text 2', 'Text 3']
    })

    def mock_get_embedding(text):
        if text == 'Text 2':
            raise ValueError("Embedding error")
        return [1, 2, 3]

    embeddings, valid_indices = generate_embeddings(
        df, mock_get_embedding, max_workers=1)

    assert np.array_equal(embeddings, np.array([[1, 2, 3], [1, 2, 3]]))
    assert valid_indices == [0, 2]

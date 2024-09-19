from typing import List
import concurrent.futures
import logging

from langchain_openai import ChatOpenAI

from langchain_community.document_loaders import WebBaseLoader, PyPDFLoader
from tenacity import retry, stop_after_attempt, wait_fixed
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import re
from bs4 import BeautifulSoup
from datetime import datetime

logger = logging.getLogger(__name__)

open_ai_llm_mini = ChatOpenAI(
    temperature=0,
    model_name="gpt-4o-mini",
)
open_ai_llm = ChatOpenAI(
    temperature=0,
    model_name="gpt-4o",
)


def clean_text(text: str, level: int = 1, max_words: int = 50000) -> str:
    """Clean the text with different levels of aggressiveness and truncate if necessary."""
    # Level 1: Basic cleaning
    text = BeautifulSoup(text, "html.parser").get_text()
    text = re.sub(r'\s+', ' ', text).strip()
    text = ''.join(char for char in text if char.isprintable())

    if level >= 2:
        # Level 2: Remove common web elements and URLs
        text = re.sub(r'(Cookie Policy|Privacy Policy|Terms of Service|Copyright ©)',
                      '', text, flags=re.IGNORECASE)
        text = re.sub(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

    if level >= 3:
        # Level 3: Remove email addresses and special characters
        text = re.sub(r'\S+@\S+', '', text)
        text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()"-]', '', text)

    # Truncate to max_words if necessary
    words = text.split()
    if len(words) > max_words:
        logger.warning(
            f"Text exceeds the maximum of {max_words} words. Truncating.")
        text = ' '.join(words[:max_words])

    return text


def article_summarizer(url: str, objective: str, model: int = 3, max_words: int = 50000) -> str:
    """
    Summarizes an online article using OpenAI's language models.

    This function loads the article from the provided URL, splits it into chunks, and uses a map-reduce approach
    to generate a summary. The map step generates summaries for each chunk, and the reduce step combines these
    summaries into a final, consolidated summary.

    Parameters:
    url (str): The URL of the online article to summarize.
    objective(str): This provides an objective for the summary of the article, including the relevant meta-data
    model (int, optional): The model to use for summarization. If 3, uses "gpt-4o-mini". Otherwise, uses "gpt-4o". Defaults to 3.

    Returns:
    str: The summary of the article. If there was an error loading the article, returns an appropriate message.
    """

    if url.endswith('.pdf'):
        try:
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.google.com/'
            }
            response = requests.get(url, headers=headers)
            response.raise_for_status()  # This will raise an exception for HTTP errors
        except Exception as e:
            logger.error(f"Error accessing URL: {e}")
            return "Error accessing URL"

        loader = PyPDFLoader(url, headers=headers)

    else:
        loader = WebBaseLoader(url)
    docs = loader.load()

    # Clean and check the word count of the article content
    article_content = ' '.join([doc.page_content for doc in docs])
    original_word_count = len(article_content.split())

    for cleaning_level in range(1, 4):
        article_content = clean_text(
            article_content, level=cleaning_level, max_words=max_words)
        if len(article_content.split()) <= max_words:
            break

    if len(article_content.split()) > max_words:
        logger.warning(
            f"Article content still exceeds the maximum of {max_words} words after cleaning. "
            f"Original word count: {original_word_count}, Cleaned word count: {len(article_content.split())}. "
            f"Truncating to {max_words} words.")
        article_content = ' '.join(article_content.split()[:max_words])

    if model == 3:
        llm = open_ai_llm_mini

    else:
        llm = open_ai_llm

    current_date = datetime.now().strftime("%Y-%m-%d")

    system_prompt = f"You are an experienced hedge fund investment analyst. You will be given an article content and your job is to summarize it. Specifically, with the objective of {objective}.\n Note that the current date is {current_date}. If the article is inaccessible, return 'INACCESSIBLE'. The summary should be in English."

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "{input}")
    ])

    chain = prompt | llm | StrOutputParser()
    input_prompt = f"Below is the article content. Return the summary of the article in English.:\n\n<article>\n\n{article_content}\n\n</article>"

    @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
    def invoke_with_retry():
        return chain.invoke({"input": input_prompt})

    try:
        return invoke_with_retry()
    except Exception as e:
        logger.error(f"Error in generating summary: {str(e)}")
        raise Exception(f"Error in generating summary: {str(e)}")


def generate_summaries(article_urls: List[str], objective: str, max_workers: int = 3) -> List[str]:
    """
    Generate summaries for the given article URLs using the article_summarizer function.

    Parameters:
    article_urls (List[str]): List of URLs to summarize
    objective (str): Objective for the summary
    max_workers (int): Maximum number of concurrent workers

    Returns:
    List[str]: List of summaries or error messages
    """
    summaries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(
            article_summarizer, url, objective): url for url in article_urls}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                summary = future.result()
                if "INACCESSIBLE" in summary:
                    summaries.append(
                        f"Article summarization not allowed. Please read article directly.")
                else:
                    summaries.append(summary)

            except Exception as e:
                logger.error(f"Error generating summary for {url}: {str(e)}")
                summaries.append(
                    f"Article summarization not possible. Please read article directly.")
    return summaries

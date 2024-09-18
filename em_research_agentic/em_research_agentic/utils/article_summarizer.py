from typing import List
import concurrent.futures
import logging

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

from langchain_community.document_loaders import WebBaseLoader
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.chains.llm import LLMChain
from langchain.chains import ReduceDocumentsChain, MapReduceDocumentsChain
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain.output_parsers.openai_functions import JsonKeyOutputFunctionsParser
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import re
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

open_ai_llm_mini = ChatOpenAI(
    temperature=0,
    model_name="gpt-4o-mini",
)
open_ai_llm = ChatOpenAI(
    temperature=0,
    model_name="gpt-4o",
)


def clean_text(text: str) -> str:
    """Clean the text by removing HTML tags, extra whitespace, and non-printable characters."""
    # Remove HTML tags
    text = BeautifulSoup(text, "html.parser").get_text()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Remove non-printable characters
    text = ''.join(char for char in text if char.isprintable())
    return text


def article_summarizer(url: str, model: int = 3, max_length: int = 90000) -> str:
    """
    Summarizes an online article using OpenAI's language models.

    This function loads the article from the provided URL, splits it into chunks, and uses a map-reduce approach
    to generate a summary. The map step generates summaries for each chunk, and the reduce step combines these
    summaries into a final, consolidated summary.

    Parameters:
    url (str): The URL of the online article to summarize.
    model (int, optional): The model to use for summarization. If 3, uses "gpt-4o-mini". Otherwise, uses "gpt-4o". Defaults to 3.
    max_length (int, optional): The maximum length of the article content. Defaults to 90000 characters.

    Returns:
    str: The summary of the article. If there was an error loading, returns an appropriate message.
    """

    loader = WebBaseLoader(url)
    try:
        docs = loader.load()
    except Exception as e:
        logger.error(f"Error in loading doc {str(e)}")
        return f"Error in loading doc {str(e)}"

   # Clean and check the length of the article content
    article_content = ''.join([doc.page_content for doc in docs])
    if len(article_content) > max_length:
        logger.warning(
            f"Article content exceeds the maximum length of {max_length} characters.")
        article_content = clean_text(article_content)
        if len(article_content) > max_length:
            logger.error(
                f"Article content still exceeds the maximum length of {max_length} characters.")
            article_content = article_content[:max_length]

    if model == 3:
        llm = open_ai_llm_mini

    else:
        llm = open_ai_llm

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an experienced hedge fund investment analyst. You will be given an article content and your job is to summarize it. If the article is inaccessible, return 'INACCESSIBLE'."),
        ("user", "{input}")
    ])

    chain = prompt | llm | StrOutputParser()

    input_prompt = f"This is the article content:\n\n<article>\n\n{article_content}\n\n</article>"

    try:
        return chain.invoke({"input": input_prompt})
    except Exception as e:
        logger.error(f"Error in generating summary: {str(e)}")
        raise Exception(f"Error in generating summary: {str(e)}")


def generate_summaries(article_urls: List[str], max_workers: int = 5) -> List[str]:
    """
    Generate summaries for the given article URLs using the article_summarizer function.
    """
    summaries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(
            article_summarizer, url): url for url in article_urls}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                summary = future.result()
                summaries.append(summary)
            except Exception as e:
                logger.error(f"Error generating summary for {url}: {str(e)}")
                summaries.append(f"Failed to generate summary for {url}")
    return summaries

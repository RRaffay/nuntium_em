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


logger = logging.getLogger(__name__)


def article_summarizer(url: str, model: int = 3, max_length: int = 20000, timeout: int = 12) -> str:
    """
    Summarizes an online article using OpenAI's language models.

    This function loads the article from the provided URL, splits it into chunks, and uses a map-reduce approach
    to generate a summary. The map step generates summaries for each chunk, and the reduce step combines these
    summaries into a final, consolidated summary.

    Parameters:
    url (str): The URL of the online article to summarize.
    model (int, optional): The model to use for summarization. If 3, uses "gpt-4o-mini". Otherwise, uses "gpt-4o". Defaults to 3.
    max_length (int, optional): The maximum length of the article content. Defaults to 20000 characters.
    timeout (int, optional): The timeout in seconds for generating the summary. Defaults to 12 seconds.

    Returns:
    str: The summary of the article. If there was an error loading the article or the article is too long, returns an appropriate message.
    """

    loader = WebBaseLoader(url)
    try:
        docs = loader.load()
    except Exception as e:
        return f"Error in loading doc {str(e)}"

    # Check the length of the article content
    article_content = ''.join([doc.page_content for doc in docs])
    if len(article_content) > max_length:
        return f"Article content exceeds the maximum length of {max_length} characters."

    if model == 3:
        open_ai_llm = ChatOpenAI(
            temperature=0,
            model_name="gpt-4o-mini",
        )
    else:
        open_ai_llm = ChatOpenAI(
            temperature=0,
            model_name="gpt-4o",
        )

    llm = open_ai_llm

    map_question = f"""The following is a portion from an online article."""

    map_template = (
        map_question
        + """:

###############################################################

{docs}

###############################################################

Based on this portion, please write a summary of the article that can be used with other summaries to create a final, consolidated summary of the article."



Helpful Answer:"""
    )

    map_prompt = PromptTemplate.from_template(map_template)
    map_chain = LLMChain(llm=llm, prompt=map_prompt)

    # Reduce
    reduce_question_start = f"The following is a set of summaries from different portions of an online article."

    reduce_question_end = f"""Take these and distill it into a final, consolidated summary.

Helpful Answer:

"""

    reduce_template = (
        reduce_question_start
        + """:

    ###############################################################

    {doc_summaries}

    ###############################################################

    """
        + reduce_question_end
    )

    reduce_prompt = PromptTemplate.from_template(reduce_template)
    # Run chain
    reduce_chain = LLMChain(llm=llm, prompt=reduce_prompt)

    # Takes a list of documents, combines them into a single string, and passes this to an LLMChain
    combine_documents_chain = StuffDocumentsChain(
        llm_chain=reduce_chain, document_variable_name="doc_summaries"
    )

    # Combines and iteravely reduces the mapped documents
    reduce_documents_chain = ReduceDocumentsChain(
        # This is final chain that is called.
        combine_documents_chain=combine_documents_chain,
        # If documents exceed context for `StuffDocumentsChain`
        collapse_documents_chain=combine_documents_chain,
        # The maximum number of tokens to group documents into.
        token_max=10000,
    )

    map_reduce_chain = MapReduceDocumentsChain(
        # Map chain
        llm_chain=map_chain,
        # Reduce chain
        reduce_documents_chain=reduce_documents_chain,
        # The variable name in the llm_chain to put the documents in
        document_variable_name="docs",
        # Return the results of the map steps in the output
        return_intermediate_steps=False,
    )

    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=10000, chunk_overlap=0
    )
    split_docs = text_splitter.split_documents(docs)

    try:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(map_reduce_chain.invoke, split_docs)
            summary = future.result(timeout=timeout)
        return summary["output_text"]
    except concurrent.futures.TimeoutError:
        return f"Timeout: Summary generation for {url} took longer than {timeout} seconds."
    except Exception as e:
        return f"Error in generating summary: {str(e)}"


def generate_summaries(article_urls: List[str], max_workers: int = 10, timeout: int = 12) -> List[str]:
    """
    Generate summaries for the given article URLs using the article_summarizer function.
    """
    summaries = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(
            article_summarizer, url, timeout=timeout): url for url in article_urls}
        for future in concurrent.futures.as_completed(future_to_url):
            url = future_to_url[future]
            try:
                summary = future.result(timeout=timeout)
                summaries.append(summary)
            except concurrent.futures.TimeoutError:
                logger.error(
                    f"Timeout: Summary generation for {url} took longer than {timeout} seconds.")
                summaries.append(
                    f"Timeout: Summary generation for {url} took longer than {timeout} seconds.")
            except Exception as e:
                logger.error(f"Error generating summary for {url}: {str(e)}")
                summaries.append(f"Failed to generate summary for {url}")
    return summaries

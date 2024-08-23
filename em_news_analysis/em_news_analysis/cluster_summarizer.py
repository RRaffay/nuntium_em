from typing import List
import logging

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema.document import Document
from langchain.schema import SystemMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.chains.llm import LLMChain
from langchain.chains import ReduceDocumentsChain, MapReduceDocumentsChain
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain.output_parsers.openai_functions import JsonKeyOutputFunctionsParser
import json
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)


def combined_summary(summaries_list: List[str], objective: str, model: int = 3) -> str:
    """
    Combine multiple summaries into a final summary.

    summaries_list List[str]: The summaries to combine.
    objective(str): This provides an objective for the summary of the article, including the relevant meta-data
    model (int, optional): The model to use for summarization. If 3, uses "gpt-4o-mini". Otherwise, uses "gpt-4o". Defaults to 3.

    Returns:
    str: The combined summary.
    """

    summaries = "\n\n".join(summaries_list)

    if model == 3:
        open_ai_llm = ChatOpenAI(
            temperature=0,
            model_name="gpt-3.5-turbo-1106",
        )

    else:
        open_ai_llm = ChatOpenAI(
            temperature=0,
            model_name="gpt-4-1106-preview",
        )

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a world class news analyst."),
        ("user", "{input}")
    ])

    output_parser = StrOutputParser()

    chain = prompt | open_ai_llm | output_parser

    input_prompt = f"{objective}\n\n{summaries}"

    return chain.invoke({"input": input_prompt})


def generate_cluster_summary(summaries: List[str], objective: str) -> str:
    """
    Generate a combined summary for a cluster using the combined_summary function.
    """
    try:
        return combined_summary(summaries, objective)
    except Exception as e:
        logger.error(f"Error generating cluster summary: {str(e)}")
        return "Failed to generate cluster summary"

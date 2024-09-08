from langchain_core.pydantic_v1 import BaseModel, Field
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
from datetime import datetime

logger = logging.getLogger(__name__)

# Should be consistent with backend and Frontend. Add tests to ensure


class Event(BaseModel):
    title: str = Field(
        default="", description="The title of the event (5-10 words)")
    summary: str = Field(default="", description="The summary of the event")
    relevant_for_financial_analysis: bool = Field(
        description="Whether the event could be of interest to an investor.")
    relevance_score: int = Field(
        description="The relevance score of the event from 0 to 5. 0 is is likely to be of no interest to an investor. 3 if the event could be of interest to an investor. 5 if the event is highly likely to be of great interest to an investor.", default=0)


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
    current_date = datetime.now().strftime("%Y-%m-%d")

    summaries_prompt = f"These are the summaries\n<Summaries>\n\n{summaries}</Summaries>.\n\nToday's date is {current_date}."

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

    open_ai_llm = open_ai_llm.with_structured_output(
        Event, method="json_mode")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an experienced hedge fund investment analyst. You will be given articles summaries about an event. For each event, summarize the main points, generate a title, and determine whether the event might be of interest to a financial markets investor. If the event is relevant to investors, assign it a score from 0 to 5, where 0 represents no significant market movement and 5 represents a major trading opportunity. Respond in JSON with title, summary, relevant_for_financial_analysis, and relevance_score as keys."),
        ("user", "{input}")
    ])

    chain = prompt | open_ai_llm

    input_prompt = f"{objective}\n\n{summaries_prompt}"

    return chain.invoke({"input": input_prompt})


def generate_cluster_summary(summaries: List[str], objective: str) -> Event:
    """
    Generate a combined summary for a cluster using the combined_summary function.
    """
    try:
        event = combined_summary(summaries, objective)
        return event
    except Exception as e:
        logger.error(f"Error generating cluster summary: {str(e)}")
        return Event(title="Error", summary="Error generating cluster summary", relevant_for_financial_analysis=False)

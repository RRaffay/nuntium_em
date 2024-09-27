from typing import List
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential
from .models import Event


logger = logging.getLogger(__name__)

# Should be consistent with backend and Frontend. Add tests to ensure


def combined_summary(summaries_list: List[str], objective: str, model: int = 4, retry_attempts: int = 3) -> str:
    """
    Combine multiple summaries into a final summary.

    summaries_list List[str]: The summaries to combine.
    objective(str): This provides an objective for the summary of the article, including the relevant meta-data
    model (int, optional): The model to use for summarization. If 3, uses "gpt-4o-mini". Otherwise, uses "gpt-4o". Defaults to 4.

    Returns:
    str: The combined summary.
    """

    summaries = "\n\n".join(summaries_list)
    current_date = datetime.now().strftime("%Y-%m-%d")

    summaries_prompt = f"{objective}\n\nThese are the summaries\n<Summaries>\n\n{summaries}</Summaries>.\n\nToday's date is {current_date}."

    system_prompt = f"You are an experienced hedge fund investment analyst. You will be given articles summaries about an event. For each event, summarize the main points, generate a title, and determine whether the event might be of interest to a investor focused on a specific country.\n Assign the event a score from 0 to 5, where 0 represents no relevance and 5 represents high relevance. Respond in JSON with title, summary, relevance_score and relevance_rationale as keys.\n If all the articles say inaccessible, return an event with title 'INACCESSIBLE' and summary 'INACCESSIBLE'. If the summaries don't seem about the same event, keep the summary about the most relevant event."

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
        ("system", system_prompt),
        ("user", "{input}")
    ])

    chain = prompt | open_ai_llm

    input_prompt = f"{objective}\n\n{summaries_prompt}"

    @retry(stop=stop_after_attempt(retry_attempts), wait=wait_exponential(multiplier=1, min=4, max=10))
    def invoke_with_retry():
        try:
            return chain.invoke({"input": input_prompt})
        except Exception as e:
            logger.error(f"Error generating cluster summary: {str(e)}")
            raise e

    return invoke_with_retry()


def generate_cluster_summary(summaries: List[str], objective: str) -> Event:
    """
    Generate a combined summary for a cluster using the combined_summary function.
    """
    try:
        event = combined_summary(summaries, objective)
        if "INACCESSIBLE" in event.title or "INACCESSIBLE" in event.summary:
            logger.error(
                f"Error generating cluster summary: {event.title} {event.summary}")
            return Event(title="Error", summary="Error generating cluster summary", relevance_rationale="N/A")

        else:
            return event
    except Exception as e:
        logger.error(f"Error generating cluster summary: {str(e)}")
        return Event(title="Error", summary="Error generating cluster summary", relevance_rationale="N/A")

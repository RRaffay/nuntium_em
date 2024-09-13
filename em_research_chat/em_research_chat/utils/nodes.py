from functools import lru_cache
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from em_research_chat.utils.state import AgentState
from langchain_core.pydantic_v1 import BaseModel
from langgraph.graph import END
from typing import List, Tuple
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage
from em_research_chat.utils.prompts import RESEARCH_PLAN_PROMPT, WRITER_PROMPT
from em_research_chat.utils.tools import tavily_client
from em_research_chat.utils.article_summarizer import generate_summaries
import concurrent.futures
from datetime import datetime


class Queries(BaseModel):
    queries: List[str]


class SearchResponse(BaseModel):
    content: str
    url: str
    title: str

    def to_string(self):
        return f"Article title:{self.title}\n\nArticle Content:\n {self.content}\n\nURL: {self.url}"


@lru_cache(maxsize=4)
def _get_model(model_name: str):
    if model_name == "openai":
        model = ChatOpenAI(temperature=0, model_name="gpt-4o")
    elif model_name == "anthropic":
        model = ChatAnthropic(
            temperature=0, model_name="claude-3-5-sonnet-20240620")
    else:
        raise ValueError(f"Unsupported model type: {model_name}")

    return model


def _search_and_summarize(query, max_results):
    response = tavily_client.search(query=query, max_results=max_results)
    article_urls = [r['url'] for r in response['results']]
    summaries = generate_summaries(article_urls)
    return [(r, summary) for r, summary in zip(response['results'], summaries)]


# Node for Research Planning


def _format_conversation_history(messages: List[Tuple[str, str]]) -> str:
    return "\n".join([f"{sender}: {content}" for content, sender in messages])


def research_plan_node(state: AgentState, config):
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)

    conversation_history = _format_conversation_history(state['messages'])

    current_date = datetime.now().strftime("%Y-%m-%d")

    queries = model.with_structured_output(Queries).invoke([
        SystemMessage(content=RESEARCH_PLAN_PROMPT.format(
            current_date=current_date)),
        HumanMessage(
            content=f"Conversation history:\n{conversation_history}\n\nThe question is:\n{state['task']}\n. Here is the equity report:\n<equity_report>\n{state['equity_report']}\n</equity_report>")
    ])

    content = state.get('content') or []
    max_results = config.get('configurable', {}).get('max_results_tavily', 2)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(
            _search_and_summarize, q, max_results) for q in queries.queries]
        for future in concurrent.futures.as_completed(futures):
            for r, summary in future.result():
                response_obj = SearchResponse(
                    content=summary, url=r['url'], title=r['title'])
                content.append(response_obj.to_string())

    return {"content": content}


# Node for Writing


def generation_node(state: AgentState, config):
    content = "\n\n".join(state['content'] or [])

    conversation_history = _format_conversation_history(state['messages'])

    current_date = datetime.now().strftime("%Y-%m-%d")

    user_message = f"Current Question: \n<current_question>\n{state['task']}\n</current_question>\n\n Conversation history:\n<conversation_history>\n{conversation_history}\n</conversation_history>\n\n"

    user_message = HumanMessage(
        content=user_message
    )
    messages = [
        SystemMessage(
            content=WRITER_PROMPT.format(
                content=content, equity_report=state['equity_report'], current_date=current_date)
        ),
        user_message
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {
        "draft": response.content,
    }

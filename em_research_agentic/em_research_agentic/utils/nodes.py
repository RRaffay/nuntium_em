from functools import lru_cache
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from em_research_agentic.utils.state import AgentState
from langchain_core.pydantic_v1 import BaseModel
from langgraph.graph import END
from typing import List
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage
from em_research_agentic.utils.prompts import RESEARCH_PLAN_PROMPT, WRITER_PROMPT, REFLECTION_PROMPT, RESEARCH_CRITIQUE_PROMPT, FINAL_REVIEW_PROMPT, PLAN_PROMPT
from em_research_agentic.utils.tools import tavily_client
from em_research_agentic.utils.article_summarizer import generate_summaries
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
    article_urls = [r['url'] for r in response['results']][:1]
    summaries = generate_summaries(article_urls)
    return [(r, summary) for r, summary in zip(response['results'], summaries)]


def plan_node(state: AgentState, config):

    input_message = f"The topic is:\n{state['task']}\n"

    current_date = datetime.now().strftime("%Y-%m-%d")

    messages = [
        SystemMessage(content=PLAN_PROMPT.format(current_date=current_date)),
        HumanMessage(content=input_message)
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {"plan": response.content}

# Node for Research Planning


def research_plan_node(state: AgentState, config):
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)

    current_date = datetime.now().strftime("%Y-%m-%d")

    queries = model.with_structured_output(Queries).invoke([
        SystemMessage(content=RESEARCH_PLAN_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=state['task'])
    ])

    content = state.get('content') or []
    max_results = config.get('configurable', {}).get('max_results_tavily', 1)

    with concurrent.futures.ThreadPoolExecutor() as executor:
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
    current_date = datetime.now().strftime("%Y-%m-%d")

    user_message = HumanMessage(
        content=f"{state['task']}\n\nHere is my plan:\n\n{state['plan']}")
    messages = [
        SystemMessage(
            content=WRITER_PROMPT.format(
                content=content, current_date=current_date)
        ),
        user_message
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {
        "draft": response.content,
        "revision_number": state.get("revision_number", 1) + 1
    }

# Node for reflection


def reflection_node(state: AgentState, config):
    current_date = datetime.now().strftime("%Y-%m-%d")

    messages = [
        SystemMessage(content=REFLECTION_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=state['draft'])
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {"critique": response.content}

# Node for Research Critique


def research_critique_node(state: AgentState, config):
    current_date = datetime.now().strftime("%Y-%m-%d")

    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    queries = model.with_structured_output(Queries).invoke([
        SystemMessage(content=RESEARCH_CRITIQUE_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=state['critique'])
    ])
    content = state['content'] or []

    max_results = config.get('configurable', {}).get('max_results_tavily', 1)

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [executor.submit(
            _search_and_summarize, q, max_results) for q in queries.queries]
        for future in concurrent.futures.as_completed(futures):
            for r, summary in future.result():
                response_obj = SearchResponse(
                    content=summary, url=r['url'], title=r['title'])
                content.append(response_obj.to_string())

    return {"content": content}


# Node for Final Review

def final_review_node(state: AgentState, config):
    current_date = datetime.now().strftime("%Y-%m-%d")

    messages = [
        SystemMessage(content=FINAL_REVIEW_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=f"Here is the report:\n\n{state['draft']}")
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {"final_report": response.content}


def should_continue(state):
    if state["revision_number"] > state["max_revisions"]:
        return "final_review"
    return "reflect"

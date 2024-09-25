from functools import lru_cache
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from em_research_agentic.utils.state import AgentState
from langchain_core.pydantic_v1 import BaseModel
from langgraph.graph import END
from typing import List
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage
from em_research_agentic.utils.prompts import RESEARCH_PLAN_PROMPT, WRITER_PROMPT, REFLECTION_PROMPT, RESEARCH_CRITIQUE_PROMPT, FINAL_REVIEW_PROMPT_O1, PLAN_PROMPT, CLARIFICATIONS_QUESTIONS_PROMPT, CLARIFICATIONS_ANALYSIS_PROMPT
from em_research_agentic.utils.tools import tavily_client
from em_research_agentic.utils.article_summarizer import generate_summaries
import concurrent.futures
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


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


def clarification_questions(task: str):
    current_date = datetime.now().strftime("%Y-%m-%d")
    input_message = CLARIFICATIONS_QUESTIONS_PROMPT.format(
        current_date=current_date, user_request=task)
    messages = [HumanMessage(content=input_message)]
    # model = ChatOpenAI(temperature=1, model_name="o1-preview")
    model = ChatOpenAI(temperature=1, model_name="o1-mini")
    # model = ChatOpenAI(temperature=0, model_name="gpt-4o")
    response = model.invoke(messages)

    logger.info(f"Clarification questions: {response.content}")

    return response.content


def clarifications_node(state: AgentState, config):

    current_date = datetime.now().strftime("%Y-%m-%d")
    input_message = f"The user request is:\n{state['task']}\n. The answers to the clarifying questions are:\n{state['clarifications']}\n."

    messages = [
        SystemMessage(content=CLARIFICATIONS_ANALYSIS_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=input_message)
    ]
    model = _get_model(config.get('configurable', {}
                                  ).get("model_name", "openai"))
    response = model.invoke(messages)
    logger.info(
        f"Clarification analysis:\n Input message: {input_message}\n Response: {response.content}")
    return {"task": response.content}

# With o-1 preview


def plan_node(state: AgentState, config):

    input_message = f"The topic is:\n{state['task']}\n. These are the clarifications:\n{state['clarifications']}\n"

    current_date = datetime.now().strftime("%Y-%m-%d")

    input_message_with_system = PLAN_PROMPT.format(
        current_date=current_date) + input_message
    messages = [HumanMessage(content=input_message_with_system)]
    model = ChatOpenAI(temperature=1, model_name="o1-preview")
    response = model.invoke(messages)
    return {"plan": response.content}


# def plan_node(state: AgentState, config):

#     input_message = f"The topic is:\n{state['task']}\n"

#     current_date = datetime.now().strftime("%Y-%m-%d")

#     messages = [
#         SystemMessage(content=PLAN_PROMPT.format(current_date=current_date)),
#         HumanMessage(content=input_message)
#     ]
#     model_name = config.get('configurable', {}).get("model_name", "openai")
#     model = _get_model(model_name)
#     response = model.invoke(messages)
#     return {"plan": response.content}


# Node for Research Planning


def research_plan_node(state: AgentState, config):
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)

    current_date = datetime.now().strftime("%Y-%m-%d")

    queries = model.with_structured_output(Queries).invoke([
        SystemMessage(content=RESEARCH_PLAN_PROMPT.format(
            current_date=current_date)),
        HumanMessage(
            content=f"The topic is:\n{state['task']}\n. The initial outline is:\n{state['plan']}\n")
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
    current_date = datetime.now().strftime("%Y-%m-%d")

    user_message = HumanMessage(
        content=f"{state['task']}\n\nHere is my plan:\n\n<Plan>\n{state['plan']}\n</Plan>")
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


# Node for Final Review

# def final_review_node(state: AgentState, config):
#     current_date = datetime.now().strftime("%Y-%m-%d")

#     messages = [
#         SystemMessage(content=FINAL_REVIEW_PROMPT.format(
#             current_date=current_date)),
#         HumanMessage(content=f"Here is the report:\n\n{state['draft']}")
#     ]
#     model_name = config.get('configurable', {}).get("model_name", "openai")
#     model = _get_model(model_name)
#     response = model.invoke(messages)
#     return {"final_report": response.content}


def final_review_node(state: AgentState, config):
    current_date = datetime.now().strftime("%Y-%m-%d")

    draft = state['draft']
    user_request = state['task']

    input_message_with_system = FINAL_REVIEW_PROMPT_O1.format(
        current_date=current_date, user_request=user_request, draft=draft)

    messages = [HumanMessage(content=input_message_with_system)]
    model = ChatOpenAI(temperature=1, model_name="o1-preview")
    response = model.invoke(messages)
    return {"final_report": response.content}


def should_continue(state):
    if state["revision_number"] > state["max_revisions"]:
        return "final_review"
    return "reflect"

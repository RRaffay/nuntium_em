from functools import lru_cache
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from em_research_chat.utils.state import AgentState
from pydantic import BaseModel
from langgraph.graph import END
from langgraph.prebuilt import ToolNode
from typing import List, Tuple
from langchain_core.messages import AnyMessage, SystemMessage, HumanMessage, AIMessage, ChatMessage
from em_research_chat.utils.prompts import RESEARCH_PLAN_PROMPT, WRITER_PROMPT, FINAL_REVIEW_PROMPT
from em_research_chat.utils.tools import tavily_client
from em_research_chat.utils.article_summarizer import generate_summaries
import concurrent.futures
from datetime import datetime
from em_research_chat.utils.tools import financial_calculator
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

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
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

    if state.get('tool_response'):
        user_message += f"Tool Response: \n<tool_response>\n{state['tool_response']}\n</tool_response>\n\n"

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
    model = _get_model(model_name).bind_tools([financial_calculator])
    response = model.invoke(messages)

    if response.tool_calls:
        logger.info("\n\n\nTool Calls:\n")
        logger.info(response.tool_calls)
        tool_calls = response.tool_calls
    else:
        tool_calls = None

    return {
        "draft": response.content,
        "tool_calls": tool_calls,
        "no_tool_calls": state.get("no_tool_calls", 0) + 1
    }


# Node for tools
def tool_node(state: AgentState, config):
    tool_calls = state["tool_calls"]
    logger.info("\n\n\nTool Calls:\n")
    logger.info(tool_calls)
    tool_call = tool_calls[0]
    if tool_call['name'] == 'financial_calculator':
        tool_args = tool_call['args']
        logger.info(f"\n\n\nTool Args: {tool_args}\n\n\n")
        tool_response_local = financial_calculator(
            url=tool_args['url'], metric=tool_args['metric'], context=tool_args['context'])

    tool_response_old = state.get('tool_response', '')

    tool_response = f"Tool Response: {tool_response_old}\n<tool_response>\n{tool_response_local}\n</tool_response>\n\n"
    logger.info(f"\n\n\nTool Response Global: {tool_response}\n\n\n")

    return {"tool_response": tool_response}

# Node for final review


def final_review_node(state: AgentState, config):
    current_date = datetime.now().strftime("%Y-%m-%d")

    input_message = f"The question is:\n\n{state['task']}\n\n.Here is the answer:\n\n{state['draft']}."

    if state.get('tool_response'):
        input_message += state['tool_response']

    messages = [
        SystemMessage(content=FINAL_REVIEW_PROMPT.format(
            current_date=current_date)),
        HumanMessage(content=input_message)
    ]
    model_name = config.get('configurable', {}).get("model_name", "openai")
    model = _get_model(model_name)
    response = model.invoke(messages)
    return {"final_answer": response.content}


def should_continue(state: AgentState):
    if state.get("no_tool_calls", 0) > 5:
        return "final_review"
    if state.get("tool_calls", None):
        return "tool_node"
    return "final_review"

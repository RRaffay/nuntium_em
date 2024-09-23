from typing import TypedDict, List, Tuple
from pydantic import Field


class AgentState(TypedDict):
    messages: List[Tuple[str, str]]
    task: str
    plan: str
    draft: str
    data: str
    content: List[str]
    no_tool_calls: int
    tool_calls: List[str]
    tool_response: str
    final_answer: str

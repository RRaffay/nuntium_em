from typing import TypedDict, List, Tuple


class AgentState(TypedDict):
    messages: List[Tuple[str, str]]
    task: str
    equity_report: str
    plan: str
    draft: str
    content: List[str]

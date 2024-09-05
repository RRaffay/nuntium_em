from typing import TypedDict, List


class AgentState(TypedDict):
    task: str
    equity_report: str
    plan: str
    draft: str
    content: List[str]

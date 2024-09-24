from typing import TypedDict, List, Optional


class AgentState(TypedDict):
    task: str
    plan: str
    draft: str
    critique: str
    content: List[str]
    revision_number: int
    max_revisions: int
    final_report: str
    clarifications: Optional[str]
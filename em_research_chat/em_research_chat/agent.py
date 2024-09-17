# Load .env file
from em_research_chat.utils.nodes import generation_node, research_plan_node, tool_node, should_continue, final_review_node
from em_research_chat.utils.state import AgentState
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END


class GraphConfig(TypedDict):
    model_name: Literal["anthropic", "openai"]
    max_results_tavily: int


builder = StateGraph(AgentState, config_schema=GraphConfig)
builder.add_node("generate", generation_node)
builder.add_node("research_plan", research_plan_node)
builder.add_node("tool_node", tool_node)
builder.add_node("final_review", final_review_node)

builder.set_entry_point("research_plan")

builder.add_conditional_edges(
    "generate",
    should_continue,
    {"tool_node": "tool_node", "final_review": "final_review"}
)


builder.add_edge("research_plan", "generate")
builder.add_edge("final_review", END)
builder.add_edge("tool_node", "generate")

graph = builder.compile()

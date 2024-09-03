# Load .env file
from em_research_chat.utils.nodes import plan_node, generation_node, research_plan_node
from em_research_chat.utils.state import AgentState
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END


class GraphConfig(TypedDict):
    model_name: Literal["anthropic", "openai"]
    max_results_tavily: int


builder = StateGraph(AgentState, config_schema=GraphConfig)
builder.add_node("planner", plan_node)
builder.add_node("generate", generation_node)
builder.add_node("research_plan", research_plan_node)
builder.set_entry_point("planner")


builder.add_edge("planner", "research_plan")
builder.add_edge("research_plan", "generate")
builder.add_edge("generate", END)

graph = builder.compile()

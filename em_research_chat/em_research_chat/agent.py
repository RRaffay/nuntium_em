# Load .env file
from em_research_chat.utils.nodes import generation_node, research_plan_node
from em_research_chat.utils.nodes_pro import tool_node, should_continue, final_review_node
from em_research_chat.utils.nodes_pro import generation_node as generation_node_pro, research_plan_node as research_plan_node_pro
from em_research_chat.utils.state import AgentState
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

class GraphConfig(TypedDict):
    model_name: Literal["anthropic", "openai"]
    max_results_tavily: int

class BaseGraph:
    def __init__(self, pro: bool = False):
        self.pro = pro

    def build_graph(self):
        if self.pro:
            return self._build_pro_graph()
        else:
            return self._build_default_graph()

    def _build_default_graph(self):
        builder = StateGraph(AgentState, config_schema=GraphConfig)
        builder.add_node("generate", generation_node)
        builder.add_node("research_plan", research_plan_node)
        builder.set_entry_point("research_plan")

        builder.add_edge("research_plan", "generate")
        builder.add_edge("generate", END)

        return builder.compile()

    def _build_pro_graph(self):
        builder = StateGraph(AgentState, config_schema=GraphConfig)
        builder.add_node("generate", generation_node_pro)
        builder.add_node("research_plan", research_plan_node_pro)
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

        return builder.compile()

# Create the graph based on the pro parameter
graph = BaseGraph(pro=False).build_graph()

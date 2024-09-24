# Load .env file
from em_research_agentic.utils.nodes import plan_node, generation_node, reflection_node, research_plan_node, research_critique_node, should_continue, final_review_node
from em_research_agentic.utils.nodes_open import plan_node as plan_node_open, generation_node as generation_node_open, reflection_node as reflection_node_open, research_plan_node as research_plan_node_open, research_critique_node as research_critique_node_open, should_continue as should_continue_open, final_review_node as final_review_node_open, clarifications_node as clarifications_node_open
from em_research_agentic.utils.state import AgentState
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

class GraphConfig(TypedDict):
    model_name: Literal["anthropic", "openai"]
    max_results_tavily: int

class BaseGraph:
    def __init__(self, open_research: bool = False, debug: bool = False):
        self.open_research = open_research
        self.debug = debug

    def build_graph(self):
        if self.open_research:
            return self._build_open_research_graph(self.debug)
        else:
            return self._build_default_graph(self.debug)

    def _build_default_graph(self, debug: bool):
        builder = StateGraph(AgentState, config_schema=GraphConfig)
        builder.add_node("planner", plan_node)
        builder.add_node("generate", generation_node)
        builder.add_node("reflect", reflection_node)
        builder.add_node("research_plan", research_plan_node)
        builder.add_node("research_critique", research_critique_node)
        builder.add_node("final_review", final_review_node)
        builder.set_entry_point("planner")

        builder.add_conditional_edges(
            "generate",
            should_continue,
            {"final_review": "final_review", "reflect": "reflect"}
        )
        builder.add_edge("planner", "research_plan")
        builder.add_edge("research_plan", "generate")
        builder.add_edge("reflect", "research_critique")
        builder.add_edge("research_critique", "generate")
        builder.add_edge("final_review", END)

        return builder.compile(debug=debug)

    def _build_open_research_graph(self, debug: bool):
        builder = StateGraph(AgentState, config_schema=GraphConfig)
        builder.add_node("clarification", clarifications_node_open)
        builder.add_node("planner", plan_node_open)
        builder.add_node("generate", generation_node_open)
        builder.add_node("reflect", reflection_node_open)
        builder.add_node("research_plan", research_plan_node_open)
        builder.add_node("research_critique", research_critique_node_open)
        builder.add_node("final_review", final_review_node_open)
        builder.set_entry_point("clarification")
        
        builder.add_conditional_edges(
            "generate",
            should_continue,
            {"final_review": "final_review", "reflect": "reflect"}
        )
        
        builder.add_edge("clarification", "planner")
        builder.add_edge("planner", "research_plan")
        builder.add_edge("research_plan", "generate")
        builder.add_edge("reflect", "research_critique")
        builder.add_edge("research_critique", "generate")
        builder.add_edge("final_review", END)

        return builder.compile(debug=debug)

# Create the graph based on the open_research parameter
graph = BaseGraph(open_research=False).build_graph()
#graph = BaseGraph(open_research=True).build_graph()

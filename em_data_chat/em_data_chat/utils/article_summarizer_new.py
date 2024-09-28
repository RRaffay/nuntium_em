import operator
from typing import Annotated, List, TypedDict

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langgraph.constants import Send
from langgraph.graph import END, START, StateGraph
from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import WebBaseLoader


async def article_summarizer() -> str:

    url = "https://python.langchain.com/v0.2/docs/versions/migrating_chains/map_reduce_chain/"

    loader = WebBaseLoader(url)
    try:
        docs = loader.load()
    except Exception as e:
        raise f"Error in loading doc {str(e)}"

    llm = ChatOpenAI(
        temperature=0,
        model_name="gpt-4o-mini",
    )

    map_question = f"""The following is a portion from an online article."""

    map_template = (
        map_question
        + """:

    ###############################################################

    {context}

    ###############################################################

    Based on this portion, please write a summary of the article that can be used with other summaries to create a final, consolidated summary of the article."



    Helpful Answer:"""
    )

    reduce_question_start = f"The following is a set of summaries from different portions of an online article."

    reduce_question_end = f"""Take these and distill it into a final, consolidated summary.

    Helpful Answer:

    """

    reduce_template = (
        reduce_question_start
        + """:

    ###############################################################

    {docs}

    ###############################################################

    """
        + reduce_question_end
    )

    map_prompt = ChatPromptTemplate([("human", map_template)])
    reduce_prompt = ChatPromptTemplate([("human", reduce_template)])

    map_chain = map_prompt | llm | StrOutputParser()
    reduce_chain = reduce_prompt | llm | StrOutputParser()

    # Graph components: define the components that will make up the graph

    # This will be the overall state of the main graph.
    # It will contain the input document contents, corresponding
    # summaries, and a final summary.

    class OverallState(TypedDict):
        # Notice here we use the operator.add
        # This is because we want combine all the summaries we generate
        # from individual nodes back into one list - this is essentially
        # the "reduce" part
        contents: List[str]
        summaries: Annotated[list, operator.add]
        final_summary: str

    # This will be the state of the node that we will "map" all
    # documents to in order to generate summaries

    class SummaryState(TypedDict):
        content: str

    # Here we generate a summary, given a document

    async def generate_summary(state: SummaryState):
        response = await map_chain.ainvoke(state["content"])
        return {"summaries": [response]}

    # Here we define the logic to map out over the documents
    # We will use this an edge in the graph

    def map_summaries(state: OverallState):
        # We will return a list of `Send` objects
        # Each `Send` object consists of the name of a node in the graph
        # as well as the state to send to that node
        return [
            Send("generate_summary", {"content": content}) for content in state["contents"]
        ]

    # Here we will generate the final summary

    async def generate_final_summary(state: OverallState):
        response = await reduce_chain.ainvoke(state["summaries"])
        return {"final_summary": response}

    # Construct the graph: here we put everything together to construct our graph
    graph = StateGraph(OverallState)
    graph.add_node("generate_summary", generate_summary)
    graph.add_node("generate_final_summary", generate_final_summary)
    graph.add_conditional_edges(START, map_summaries, ["generate_summary"])
    graph.add_edge("generate_summary", "generate_final_summary")
    graph.add_edge("generate_final_summary", END)
    app = graph.compile()

    async def run_graph():
        step = await app.ainvoke({"contents": [doc.page_content for doc in docs]})
        return step

    step = await run_graph()
    print(f"\n\n{step['final_summary']}\n\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(article_summarizer())

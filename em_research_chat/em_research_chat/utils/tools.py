from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import UnstructuredFileLoader
from dotenv import load_dotenv
from langgraph.prebuilt import chat_agent_executor
from langchain_experimental.utilities import PythonREPL
from langchain_openai import ChatOpenAI
from typing import Annotated
from langchain_core.tools import tool
import os
from tavily import TavilyClient
from langchain_community.document_loaders import WebBaseLoader
import logging

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


repl = PythonREPL()
load_dotenv()


logger = logging.getLogger(__name__)


def financial_calculator(url: Annotated[str, "URL of the data."], metric: Annotated[str, "Financial Metric to be calculated."], context: Annotated[str, "Context of the analysis. This will help the tool to better understand the analysis."]) -> str:
    # Do not remove this docstring
    """Use this tool to calculate financial metrics."""

    try:
        @tool("get_content")
        def get_content(url: Annotated[str, "URL of the data."], max_length: int = 90000):
            """Use this tool to get the content of the file. This will return the content of the file."""
            try:
                loader = WebBaseLoader(url)
                docs = loader.load()
                article_content = ''.join([doc.page_content for doc in docs])
                if len(article_content) > max_length:
                    logger.error(
                        f"Article content exceeds the maximum length of {max_length} characters.")
                    return f"Article content exceeds the maximum length of {max_length} characters."
                return article_content

            except Exception as e:
                logger.error(f"Error in loading doc {str(e)}")
                return f"Error in loading doc {str(e)}"

        @tool("python_repl")
        def python_repl(
            code: Annotated[str,
                            "The python code to perform calculations. To access the output, you must add a print statement."]
        ):
            """Use this to execute python code where you need to perform calculations. To access the output, you must add a print statement. Not using print statement will not return any output."""
            try:
                result = repl.run(code)
            except Exception as e:
                return f"Failed to execute. Error: {repr(e)}"

            if result == "":
                result = "No output from the code. Please add a print statement to get the output."

            result = f"Code:\n```python\n{code}\n```\nStdout: {result}"
            return result

        llm = ChatOpenAI(model='gpt-4o')

        tools = [python_repl, get_content]
        agent_executor = chat_agent_executor.create_tool_calling_executor(
            llm, tools)

        system_message = """You are a helpful AI that specializes in financial analysis. Your job is to calculate a financial metric. You will be given a url. Use your tools to get the content of the file and perform any calculations needed. 
        
        Always cite what information you've used. Always outline the process you've followed to get the result. If you're making assumptions, state and justify them.
        
        If you're dealing with an excel file with a high volume of numerical data, use the python_repl tool to read and analyze the data.
        """

        human_message = f"Metric: {metric}. \n\nURL:\n{url}.\n\nContext: {context}"

        response = agent_executor.invoke(
            {"messages": [SystemMessage(
                content=system_message), HumanMessage(content=human_message)]}
        )

        if response["messages"][-1].content == "":
            return "Error retrieving file content."

        return response["messages"][-1].content
    except Exception as e:
        print(f"Error parsing file: {e}")
        return f"Error analyzing file {e}"

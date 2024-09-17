from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from langgraph.prebuilt import chat_agent_executor
from langchain_experimental.utilities import PythonREPL
from langchain_openai import ChatOpenAI
from typing import Annotated, List
from langchain_core.tools import tool
import os
from tavily import TavilyClient
from langchain_community.document_loaders import WebBaseLoader, PyPDFLoader
import logging
import re
from bs4 import BeautifulSoup

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


repl = PythonREPL()
load_dotenv()


logger = logging.getLogger(__name__)


def financial_calculator(urls: Annotated[List[str], "List of URLs of the data (max 5)."], metrics: Annotated[List[str], "Financial Metrics to be calculated."], context: Annotated[str, "Context of the analysis. This will help the tool to better understand the analysis."]) -> str:
    # Do not remove this docstring
    """Use this tool to calculate financial metrics based on multiple data sources.

    Note: This tool will only process up to 5 URLs. If more are provided, only the first 5 will be used."""

    logger.info(
        f"Starting financial calculation for metrics: {metrics}, URLs: {urls[:5]}")

    metrics_str = ', '.join(metrics)
    urls = urls[:5]  # Limit to first 5 URLs

    try:
        def clean_text(text: str, level: int = 1) -> str:
            """Clean the text with different levels of aggressiveness."""
            # Level 1: Basic cleaning
            text = BeautifulSoup(text, "html.parser").get_text()
            text = re.sub(r'\s+', ' ', text).strip()
            text = ''.join(char for char in text if char.isprintable())

            if level >= 2:
                # Level 2: Remove common web elements and URLs
                text = re.sub(r'(Cookie Policy|Privacy Policy|Terms of Service|Copyright ©)',
                              '', text, flags=re.IGNORECASE)
                text = re.sub(
                    r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

            if level >= 3:
                # Level 3: Remove email addresses and special characters
                text = re.sub(r'\S+@\S+', '', text)
                text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()"-]', '', text)

            return text

        @tool("get_content")
        def get_content(url: Annotated[str, "URL of the data."], max_length: int = 90000):
            """Use this tool to get the content of the file. This will return the content of the file."""
            try:
                logger.info(f"Loading content from URL: {url}")

                # Check if the URL is a PDF
                if url.endswith('.pdf'):
                    loader = PyPDFLoader(url)
                else:
                    loader = WebBaseLoader(url)
                docs = loader.load()
                # Clean and check the length of the article content
                article_content = ' '.join([doc.page_content for doc in docs])
                original_length = len(article_content)

                for cleaning_level in range(1, 4):
                    article_content = clean_text(
                        article_content, level=cleaning_level)
                    if len(article_content) <= max_length:
                        break

                if len(article_content) > max_length:
                    logger.warning(
                        f"Article content still exceeds the maximum length of {max_length} characters after cleaning. "
                        f"Original length: {original_length}, Cleaned length: {len(article_content)}. "
                        f"Truncating to {max_length} characters.")
                    article_content = article_content[:max_length]

                return_string = f"URL: {url}\n\nContent: {article_content}"

                return return_string

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
                logger.warning(f"Executing code: {code}")
                result = repl.run(code)
            except Exception as e:
                logger.error(f"Error in executing code: {repr(e)}")
                return f"Failed to execute. Error: {repr(e)}"

            if result == "":
                result = "No output from the code. Please add a print statement to get the output."

            result = f"Code:\n```python\n{code}\n```\nStdout: {result}"
            return result

        @tool("get_urls_based_on_query")
        def get_urls_based_on_query(query: Annotated[str, "The query to search for."]):
            """Use this tool to get the URLs based on the query. This will return the top 5 URLs that are most relevant to the query."""
            response = tavily_client.search(query=query, max_results=5)
            urls = [r['url'] for r in response['results']]
            return urls

        llm = ChatOpenAI(model='gpt-4o-mini')

        tools = [python_repl, get_content, get_urls_based_on_query]
        agent_executor = chat_agent_executor.create_tool_calling_executor(
            llm, tools)

        system_message = """You are a helpful AI that specializes in financial analysis. Your job is to calculate financial metrics. You will be given multiple URLs (up to 5). Use your tools to get the content of the files, get additional information from the web as needed, and perform any calculations needed.
        
        Always cite what information you've used. Always outline the process you've followed to get the result. If you're making assumptions, state and justify them.
        
        If you're dealing with excel files or high volumes of numerical data, use the python_repl tool to read and analyze the data.
        """

        human_message = f"Metrics: {metrics_str}. \n\nURLs:\n{', '.join(urls)}.\n\nContext: {context}"

        logger.info("Invoking agent executor")
        response = agent_executor.invoke(
            {"messages": [SystemMessage(
                content=system_message), HumanMessage(content=human_message)]}
        )

        if response["messages"][-1].content == "":
            logger.warning("Empty response from agent executor")
            return "Error retrieving file content."

        logger.info("Successfully completed financial calculation")
        return response["messages"][-1].content
    except Exception as e:
        logger.error(f"Error in financial_calculator: {str(e)}", exc_info=True)
        return f"Error analyzing files: {e}"

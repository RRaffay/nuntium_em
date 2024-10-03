import os
from tavily import TavilyClient
# Load the API key from the environment
from dotenv import load_dotenv

load_dotenv()

# tavily = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


print(tavily._search("What is the best way to learn Python?"))

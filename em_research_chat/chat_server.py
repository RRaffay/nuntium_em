from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from em_research_chat.agent import graph
import logging
from typing import List, Tuple

app = FastAPI()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class GraphInput(BaseModel):
    task: str
    equity_report: str
    messages: List[Tuple[str, str]] = Field(default_factory=list)
    debug: bool = False


@app.post("/run_research_chat")
async def run_research_chat(input_data: GraphInput):
    try:
        thread = {"configurable": {"thread_id": "1"}}
        s = await graph.ainvoke({
            'task': input_data.task,
            "equity_report": input_data.equity_report,
            "messages": input_data.messages,
        }, thread, debug=input_data.debug)
        return {"final_answer": s['final_answer']}
    except Exception as e:
        logging.error(f"Error in run_graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    logger.info("Health check")
    return Response(status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)

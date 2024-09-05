from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from em_research_chat.agent import graph
import logging


app = FastAPI()
logging.basicConfig(level=logging.INFO)


class GraphInput(BaseModel):
    task: str
    equity_report: str
    debug: bool = False


@app.post("/run_research_chat")
async def run_research_chat(input_data: GraphInput):
    try:
        thread = {"configurable": {"thread_id": "1"}}
        s = await graph.ainvoke({
            'task': input_data.task,
            "equity_report": input_data.equity_report,
        }, thread, debug=input_data.debug)
        return {"draft": s['draft']}
    except Exception as e:
        logging.error(f"Error in run_graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)

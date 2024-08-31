from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from em_research_agentic.agent import graph
import logging


app = FastAPI()
logging.basicConfig(level=logging.INFO)


class GraphInput(BaseModel):
    task: str
    max_revisions: int
    revision_number: int
    debug: bool = False


class EconomicReportInput(BaseModel):
    country: str
    debug: bool = False


@app.post("/run_graph")
async def run_graph(input_data: GraphInput):
    try:
        thread = {"configurable": {"thread_id": "1"}}
        s = await graph.ainvoke({
            'task': input_data.task,
            "max_revisions": input_data.max_revisions,
            "revision_number": input_data.revision_number,
        }, thread, debug=input_data.debug)
        return {"draft": s['draft']}
    except Exception as e:
        logging.error(f"Error in run_graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/economic_report")
async def economic_report(input_data: EconomicReportInput):
    try:
        thread = {"configurable": {"thread_id": "2"}}
        s = await graph.ainvoke({
            'task': f"Write an equity report for {input_data.country} based on the recent events. Research the background of each investment and create comprehensive explanations justifying these investments. Avoid general superficial claims and ensure each highlighted investment is analyzed in depth.",
            "max_revisions": 2,
            "revision_number": 1,
        }, thread, debug=input_data.debug)
        return {"draft": s['draft']}
    except Exception as e:
        logging.error(f"Error in economic_report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from em_research_agentic.agent import graph
import logging


app = FastAPI()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class GraphInput(BaseModel):
    task: str
    max_revisions: int
    revision_number: int
    debug: bool = False


class EconomicReportInput(BaseModel):
    country: str
    task: str
    max_revisions: int
    revision_number: int
    debug: bool = False


@app.post("/run_graph")
async def run_graph(input_data: GraphInput):
    try:
        thread = {"configurable": {"thread_id": "1"}}
        logger.info(f"Running graph with input: {input_data}")
        s = await graph.ainvoke({
            'task': input_data.task,
            "max_revisions": input_data.max_revisions,
            "revision_number": input_data.revision_number,
        }, thread, debug=input_data.debug)
        return {"final_report": s['final_report']}
    except Exception as e:
        logging.error(f"Error in run_graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/economic_report")
async def economic_report(input_data: EconomicReportInput):
    try:
        thread = {"configurable": {"thread_id": "2"}}
        s = await graph.ainvoke({
            'task': input_data.task,
            "max_revisions": input_data.max_revisions,
            "revision_number": input_data.revision_number,
        }, thread, debug=input_data.debug)
        return {"final_report": s['final_report']}
    except Exception as e:
        logging.error(f"Error in economic_report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    logger.info("Health check")
    return Response(status_code=200)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

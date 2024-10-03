from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from em_research_agentic.agent import graph, BaseGraph
from em_research_agentic.utils.nodes_open import clarification_questions
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

class OpenResearchReportInput(BaseModel):
    task: str
    clarifications: str
    max_revisions: int
    revision_number: int
    debug: bool = True

class EconomicReportInput(BaseModel):
    country: str
    task: str
    max_revisions: int
    revision_number: int
    debug: bool = False


class ClarifyingQuestionsInput(BaseModel):
    task: str

@app.post("/run_report_generation")
async def run_report_generation(input_data: GraphInput):
    try:
        thread = {"configurable": {"thread_id": "1"}}
        logger.info(f"Running graph with input: {input_data}")
        
        graph = BaseGraph(open_research=False, debug=input_data.debug).build_graph()
        
        s = await graph.ainvoke({
            'task': input_data.task,
            "max_revisions": input_data.max_revisions,
            "revision_number": input_data.revision_number,
        }, thread)
        return {"final_report": s['final_report']}
    except Exception as e:
        logging.error(f"Error in run_graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/generate_clarifying_questions")
async def generate_clarifying_questions(input_data: ClarifyingQuestionsInput):
    try:
        clarifying_questions = clarification_questions(input_data.task)
        return {"clarifying_questions": clarifying_questions}
    except Exception as e:
        logging.error(f"Error in generate_clarifying_questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/open_research_report")
async def open_research_report(input_data: OpenResearchReportInput):
    try:
        thread = {"configurable": {"thread_id": "2"}}
        
        graph = BaseGraph(open_research=True, debug=input_data.debug).build_graph()
        
        s = await graph.ainvoke({
            'task': input_data.task,
            "max_revisions": input_data.max_revisions,
            "revision_number": input_data.revision_number,
            "clarifications": input_data.clarifications,
        }, thread)
        return {"final_report": s['final_report']}
    except Exception as e:
        logging.error(f"Error in open_research_report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/economic_report")
async def economic_report(input_data: EconomicReportInput):
    try:
        thread = {"configurable": {"thread_id": "3"}}
        
        graph = BaseGraph(open_research=False).build_graph()
        
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

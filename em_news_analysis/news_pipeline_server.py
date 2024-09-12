from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
from em_news_analysis import Config, GDELTNewsPipeline
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI()


class PipelineInput(BaseModel):
    input_sentence: str = Field(
        default="Political Changes")
    country: str
    country_fips_10_4_code: str
    hours: int
    article_summarizer_objective: str = Field(
        default="")
    cluster_summarizer_objective: str = Field(
        default="")
    process_all: bool
    sample_size: int
    max_workers_embeddings: int
    max_workers_summaries: int
    user_id: str


@app.post("/run_pipeline")
async def run_pipeline(input_data: PipelineInput):
    config = Config()
    pipeline = GDELTNewsPipeline(config)

    try:
        _ = pipeline.run_pipeline(
            input_sentence=input_data.input_sentence,
            country=input_data.country_fips_10_4_code,
            hours=input_data.hours,
            article_summarizer_objective=input_data.article_summarizer_objective,
            cluster_summarizer_objective=input_data.cluster_summarizer_objective,
            process_all=input_data.process_all,
            sample_size=input_data.sample_size,
            max_workers_embeddings=input_data.max_workers_embeddings,
            max_workers_summaries=input_data.max_workers_summaries,
            user_id=input_data.user_id
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "Welcome to the GDELT News Analysis API"}


@app.get("/health")
async def health():
    logger.info("Health check")
    return Response(status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

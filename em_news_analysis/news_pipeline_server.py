from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from em_news_analysis import Config, GDELTNewsPipeline

app = FastAPI()


class PipelineInput(BaseModel):
    input_sentence: str = Field(
        default="Political Changes")
    country: str
    country_alpha2_code: str
    hours: int
    article_summarizer_objective: str = Field(
        default="")
    cluster_summarizer_objective: str = Field(
        default="")
    process_all: bool = False
    sample_size: int = 1500
    max_workers: int = 10
    user_id: str


@app.post("/run_pipeline")
async def run_pipeline(input_data: PipelineInput):
    config = Config()
    pipeline = GDELTNewsPipeline(config)

    try:
        _ = pipeline.run_pipeline(
            input_sentence=input_data.input_sentence,
            country=input_data.country_alpha2_code,
            hours=input_data.hours,
            article_summarizer_objective=input_data.article_summarizer_objective,
            cluster_summarizer_objective=input_data.cluster_summarizer_objective,
            process_all=input_data.process_all,
            sample_size=input_data.sample_size,
            max_workers=input_data.max_workers,
            user_id=input_data.user_id
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "Welcome to the GDELT News Analysis API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

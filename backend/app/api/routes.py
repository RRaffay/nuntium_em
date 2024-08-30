from fastapi import APIRouter, HTTPException
from core.reports import economic_report, economic_report_event
from core.pipeline import run_pipeline, CountryPipelineInputApp
from models import CountryData, Report
from db.data import fetch_country_data, addable_countries
from datetime import datetime


router = APIRouter()


@router.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}


@router.post("/run-country-pipeline")
async def run_country_pipeline(input_data: CountryPipelineInputApp):
    try:
        # Check if the country is in the addable countries list
        if input_data.country not in addable_countries:
            raise HTTPException(
                status_code=400, detail="Country not in addable countries list")

        input_data.country_alpha2_code = addable_countries[input_data.country]

        result = await run_pipeline(input_data)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def get_countries():
    return await fetch_country_data()


@router.get("/addable-countries")
async def get_addable_countries():
    return list(addable_countries.keys())


@router.get("/countries/{country}", response_model=CountryData)
async def get_country_data(country: str):
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")
    return country_data[country]


@router.post("/countries/{country}/generate-report", response_model=Report)
async def generate_country_report(country: str):
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = f"# Economic Report for {country}\n\n"
    report_content += economic_report(country) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())


@router.post("/countries/{country}/events/{event_id}/generate-report", response_model=Report)
async def generate_event_report(country: str, event_id: str):
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = await economic_report_event(country, event_id) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())

from fastapi import APIRouter, HTTPException
from core.reports import economic_report, economic_report_event
from models import CountryData, Report
from db.data import country_data
from datetime import datetime


router = APIRouter()


@router.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}


@router.get("/countries")
async def get_countries():
    return list(country_data.keys())


@router.get("/countries/{country}", response_model=CountryData)
async def get_country_data(country: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")
    return country_data[country]


@router.post("/countries/{country}/generate-report", response_model=Report)
async def generate_country_report(country: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = f"# Economic Report for {country}\n\n"
    report_content += economic_report(country) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())


@router.post("/countries/{country}/events/{event_id}/generate-report", response_model=Report)
async def generate_event_report(country: str, event_id: str):
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    report_content = f"# Economic Report for Event {event_id} in {country}\n\n"
    report_content += economic_report_event(country, event_id) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())

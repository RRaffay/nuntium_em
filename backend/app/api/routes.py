from fastapi import APIRouter, HTTPException, Depends, Request
from core.reports import economic_report, economic_report_event, EventReportInput, CountryReportInput
from core.pipeline import run_pipeline, CountryPipelineInputApp, CountryPipelineRequest
from core.report_chat import economic_report_chat, ChatRequest
from models import CountryData, Report
from db.data import fetch_country_data, addable_countries, delete_country_data
from datetime import datetime
from auth.users import current_active_user
from auth.auth_db import User
import base64
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from config import settings

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


@router.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}


@router.post("/run-country-pipeline")
@limiter.limit(settings.RATE_LIMITS["run_country_pipeline"])
async def run_country_pipeline(request: Request, input_data: CountryPipelineRequest, user: User = Depends(current_active_user)):
    """
    Run the country pipeline for data processing.

    Args:
        input_data (CountryPipelineInputApp): The input data for the pipeline.

    Returns:
        dict: A dictionary containing the status and result of the pipeline execution.

    Raises:
        HTTPException: If the country is not in the addable countries list or if there's an error during execution.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        # Check if the country is in the addable countries list
        if input_data.country not in addable_countries:
            raise HTTPException(
                status_code=400, detail="Country not in addable countries list")

        pipeline_input = CountryPipelineInputApp(
            country=input_data.country,
            country_fips_10_4_code=addable_countries[input_data.country],
            hours=input_data.hours,
            user_id=str(user.id)
        )

        logger.info(f"Running pipeline with user_id: {pipeline_input.user_id}")

        result = await run_pipeline(pipeline_input)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Error in run_country_pipeline: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def get_countries(user: User = Depends(current_active_user)):
    """
    Retrieve a list of all countries with their latest data.

    Returns:
        list: A list of dictionaries containing country information including name, timestamp, hours, and number of relevant events.
    """
    try:
        countries = await fetch_country_data(str(user.id))
        return sorted(
            [
                {
                    "name": country,
                    "timestamp": data.timestamp.isoformat(),
                    "hours": data.hours,
                    "no_relevant_events": data.no_relevant_events
                }
                for country, data in countries.items()
            ],
            key=lambda x: x["name"]
        )
    except Exception as e:
        logger.error(f"Error in get_countries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/addable-countries")
async def get_addable_countries():
    """
    Retrieve a list of countries that can be added to the system.

    Returns:
        list: A list of country names that can be added to the system.
    """
    return list(addable_countries.keys())


@router.get("/countries/{country}", response_model=CountryData)
async def get_country_data(country: str, user: User = Depends(current_active_user)):
    """
    Retrieve detailed data for a specific country.

    Args:
        country (str): The name of the country to retrieve data for.

    Returns:
        CountryData: Detailed data for the specified country.

    Raises:
        HTTPException: If the country is not found in the database.
    """
    try:
        country_data = await fetch_country_data(str(user.id))
        if country not in country_data:
            raise HTTPException(status_code=404, detail="Country not found")
        return country_data[country]
    except Exception as e:
        logger.error(f"Error in get_country_data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/countries/{country}/generate-report", response_model=Report)
@limiter.limit(settings.RATE_LIMITS["generate_country_report"])
async def generate_country_report(request: Request, country: str, user: User = Depends(current_active_user)):
    """
    Generate an economic report for a specific country.
    Args:
        country (str): The name of the country.

    Returns:
        Report: A Report object containing the generated report content and timestamp.

    Raises:
        HTTPException: If the country is not found in the database.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        user_id = str(user.id)
        country_data = await fetch_country_data(user_id)
        if country not in country_data:
            raise HTTPException(status_code=404, detail="Country not found")

        area_of_interest = user.area_of_interest

        report_input = CountryReportInput(
            country=country,
            area_of_interest=area_of_interest
        )
        report_content = await economic_report(report_input)

        return Report(content=report_content, generated_at=datetime.now().isoformat())
    except Exception as e:
        logger.error(
            f"Error in generate_country_report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/countries/{country}/events/{event_id}/generate-report", response_model=Report)
@limiter.limit(settings.RATE_LIMITS["generate_event_report"])
async def generate_event_report(request: Request, country: str, event_id: str, user: User = Depends(current_active_user)):
    """
    Generate an economic report for a specific country.

    Args:
        country (str): The name of the country.

    Returns:
        Report: A Report object containing the generated report content and timestamp.

    Raises:
        HTTPException: If the country is not found in the database.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        user_id = str(user.id)
        country_data = await fetch_country_data(user_id)
        if country not in country_data:
            raise HTTPException(status_code=404, detail="Country not found")

        country_info = country_data[country]
        event = next(
            (e for e in country_info.events if e.id == event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        area_of_interest = user.area_of_interest

        report_input = EventReportInput(
            country=country,
            area_of_interest=area_of_interest,
            event=event
        )
        report_content = await economic_report_event(report_input)

        return Report(content=report_content, generated_at=datetime.now().isoformat())
    except Exception as e:
        logger.error(
            f"Error in generate_event_report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/countries/{country}")
async def delete_country(country: str, user: User = Depends(current_active_user)):
    """
    Delete the data for a specific country.

    Args:
        country (str): The name of the country to delete data for.

    Returns:
        dict: A message indicating the success of the deletion.
    """
    try:
        country_data = await fetch_country_data(str(user.id))
        if country not in country_data:
            raise HTTPException(status_code=404, detail="Country not found")

        success = await delete_country_data(country, str(user.id))
        if success:
            return {"message": f"Country data for {country} has been deleted"}
        else:
            raise HTTPException(
                status_code=500, detail="Failed to delete country data")
    except Exception as e:
        logger.error(f"Error in delete_country: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-chat")
@limiter.limit(settings.RATE_LIMITS["research_chat"])
async def research_chat(request: Request, chat_request: ChatRequest, user: User = Depends(current_active_user)):
    """
    Send a chat message to the research chat.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        # First, try UTF-8 decoding
        try:
            decoded_report = base64.b64decode(
                chat_request.encodedReport).decode('utf-8')
        except UnicodeDecodeError:
            # If UTF-8 fails, try decoding as ISO-8859-1 (Latin-1)
            decoded_report = base64.b64decode(
                chat_request.encodedReport).decode('iso-8859-1')

        return await economic_report_chat(chat_request.message, decoded_report, chat_request.messages)
    except Exception as e:
        logger.error(f"Error in research_chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

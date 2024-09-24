from core.metric import get_country_metrics
from fastapi import APIRouter, HTTPException, Depends, Request
from core.reports import (
    economic_report, economic_report_event, EventReportInput, CountryReportInput,
    generate_clarifying_questions, open_research_report, ClarifyingQuestionsInput, OpenResearchReportInput
)
from core.pipeline import run_pipeline, CountryPipelineInputApp, CountryPipelineRequest
from core.report_chat import economic_report_chat, ChatRequest
from models import CountryData, Report, ChatMessage
from db.data import fetch_country_data, addable_countries, delete_country_data
from datetime import datetime
from auth.users import current_active_user
from auth.auth_db import User
import base64
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from config import settings
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import Dict, Any, List
from core.data_chat import data_chat, DataChatRequest
from cache.cache import cached_with_logging, DateTimeEncoder
import json

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

@router.post("/open-research-report")
@limiter.limit(settings.RATE_LIMITS["open_research_report"])
async def open_research_report_route(request: Request, input_data: Dict[str, Any], user: User = Depends(current_active_user)):
    """
    Generate an open research report based on the task and clarifications.

    Args:
        input_data (Dict[str, Any]): A dictionary containing 'task', 'questions', and 'answers'.

    Returns:
        dict: A dictionary containing the generated report.

    Raises:
        HTTPException: If there's an error during execution or if the input is invalid.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        task = input_data.get('task')
        questions = input_data.get('questions', [])
        answers = input_data.get('answers', [])

        
        logger.info(f"Received open research report request with task: {task}")
        logger.info(f"Received questions: {questions}")
        logger.info(f"Received answers: {answers}")

        if not task or len(questions) != len(answers):
            raise HTTPException(status_code=400, detail="Invalid input data")

        # Combine questions and answers into clarifications
        clarifications = "\n".join([f"Q: {q}\nA: {a}" for q, a in zip(questions, answers)])

        report_input = OpenResearchReportInput(
            task=task,
            clarifications=clarifications
        )

        report_content = await open_research_report(report_input)
        logger.info(f"Generated open research report: {report_content}")
        return Report(content=report_content, generated_at=datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Error in open_research_report_route: {str(e)}", exc_info=True)
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

        # Create a new ChatRequest with the decoded report
        input_request = ChatRequest(
            message=chat_request.message,
            encodedReport=decoded_report,
            messages=chat_request.messages,
            proMode=chat_request.proMode
        )

        return await economic_report_chat(input_request)
    except Exception as e:
        logger.error(f"Error in research_chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries/{country}/metrics")
@cached_with_logging(expire=settings.METRIC_CACHE_TIMEOUT)
@limiter.limit(settings.RATE_LIMITS["get_country_metrics"])
async def get_country_metrics_route(request: Request, country: str, user: User = Depends(current_active_user)):
    limiter.key_func = lambda: str(user.id)
    try:
        logger.info(f"Fetching metrics for {country}")
        metrics = get_country_metrics(country)
        logger.info(f"Successfully retrieved metrics for {country}")
        
        serialized_metrics = json.loads(json.dumps(metrics, cls=DateTimeEncoder))
        
        return serialized_metrics
    except ValueError as ve:
        logger.error(f"ValueError in get_country_metrics_route: {ve}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in get_country_metrics_route: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "An error occurred while processing the metrics.",
                "details": str(e),
                "message": "Some metrics may be unavailable due to a temporary issue with the data source."
            }
        )


@router.post("/countries/{country}/data-question")
@limiter.limit(settings.RATE_LIMITS["data_question"])
async def handle_data_question(request: Request, country: str, payload: Dict[str, Any], user: User = Depends(current_active_user)):
    limiter.key_func = lambda: str(user.id)
    data = payload.get('data')
    question = payload.get('question')
    messages = payload.get('messages', [])
    pro_mode = payload.get('proMode', False)
    country = payload.get('country', '')

    if not data or not question:
        raise HTTPException(
            status_code=400, detail="Data and question are required.")

    if not isinstance(messages, list):
        raise HTTPException(status_code=400, detail="Messages must be a list.")

    try:
        # Convert messages to the format expected by DataChatRequest
        chat_messages = [(msg['content'], msg['sender']) for msg in messages]

        # Create a DataChatRequest object
        chat_request = DataChatRequest(
            message=question,
            data=data,
            messages=chat_messages,
            proMode=pro_mode,
            country=country
        )

        logger.info(f"Received data question for {country}: {question}")
        logger.info(f"Message history: {chat_messages}")

        # Use the data_chat function instead of process_question_with_data
        answer = await data_chat(chat_request)

        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error in handle_data_question: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-clarifying-questions")
@limiter.limit(settings.RATE_LIMITS["generate_clarifying_questions"])
async def generate_clarifying_questions_route(request: Request, input_data: ClarifyingQuestionsInput, user: User = Depends(current_active_user)):
    """
    Generate clarifying questions for a given task.

    Args:
        input_data (ClarifyingQuestionsInput): The input data containing the task.

    Returns:
        dict: A dictionary containing the generated clarifying questions.

    Raises:
        HTTPException: If there's an error during execution.
    """
    limiter.key_func = lambda: str(user.id)
    try:
        logger.info(f"Generating clarifying questions for task: {input_data.task}")
        questions = await generate_clarifying_questions(input_data)
        logger.info(f"Generated clarifying questions: {questions}")
        return {"questions": questions}
    except Exception as e:
        logger.error(f"Error in generate_clarifying_questions_route: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


import pytest
from unittest.mock import patch, AsyncMock
from main import app
from db.data import addable_countries
import logging
import json
from datetime import datetime
from models import CountryData, Event, ArticleInfo

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the EM Investor API"}
    logger.info(
        f"Response status: {response.status_code}, content: {response.json()}")


def test_get_addable_countries(client):
    response = client.get("/addable-countries")
    assert response.status_code == 200
    assert response.json() == list(addable_countries.keys())
    logger.info(
        f"Response status: {response.status_code}, content: {response.json()}")


@pytest.mark.asyncio
async def test_get_countries(authenticated_client):
    response = await authenticated_client.get("/countries")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    logger.info(
        f"Response status: {response.status_code}, content: {response.json()}")


@pytest.mark.asyncio
async def test_run_country_pipeline(authenticated_client):
    mock_pipeline_result = "Mocked pipeline result"

    with patch('api.routes.run_pipeline', new_callable=AsyncMock) as mock_run_pipeline:
        mock_run_pipeline.return_value = mock_pipeline_result

        response = await authenticated_client.post("/run-country-pipeline", json={
            "country": "Brazil",
            "hours": 3,
            "area_of_interest": "Technology"
        })

        assert response.status_code == 200
        assert response.json() == {'status': 'success',
                                   'result': mock_pipeline_result}
        mock_run_pipeline.assert_called_once()


@pytest.mark.asyncio
async def test_get_country_data(authenticated_client):
    mock_country_data = {
        "Brazil": CountryData(
            country="Brazil",
            events=[],
            timestamp=datetime.now(),
            hours=3,
            no_relevant_events=0,
            user_id="66fad757a7c3aca4ca322123"
        )
    }

    with patch('api.routes.fetch_country_data', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_country_data

        response = await authenticated_client.get("/countries/Brazil")

        assert response.status_code == 200
        assert response.json()["country"] == "Brazil"
        mock_fetch.assert_called_once()


@pytest.mark.asyncio
async def test_generate_country_report(authenticated_client):
    mock_report_content = "This is a mock economic report for Brazil."
    mock_country_data = {
        "Brazil": CountryData(
            country="Brazil",
            events=[],
            timestamp=datetime.now(),
            hours=3,
            no_relevant_events=0,
            user_id="test_user_id"
        )
    }

    with patch('api.routes.fetch_country_data', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_country_data
        with patch('api.routes.economic_report', new_callable=AsyncMock) as mock_report:
            mock_report.return_value = mock_report_content

            response = await authenticated_client.post("/countries/Brazil/generate-report")

            assert response.status_code == 200
            assert response.json()["content"] == mock_report_content
            mock_fetch.assert_called_once()
            mock_report.assert_called_once()


@pytest.mark.asyncio
async def test_delete_country(authenticated_client):
    mock_country_data = {
        "Brazil": CountryData(
            country="Brazil",
            events=[],
            timestamp=datetime.now(),
            hours=3,
            no_relevant_events=0,
            user_id="66fad757a7c3aca4ca322123"
        )
    }

    with patch('api.routes.fetch_country_data', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_country_data
        with patch('api.routes.delete_country_data', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True

            response = await authenticated_client.delete("/countries/Brazil")

            assert response.status_code == 200
            assert response.json()[
                "message"] == "Country data for Brazil has been deleted"
            mock_fetch.assert_called_once_with("66fad757a7c3aca4ca322123")
            mock_delete.assert_called_once_with(
                "Brazil", "66fad757a7c3aca4ca322123")


@pytest.mark.asyncio
async def test_update_country(authenticated_client):
    mock_update_result = "Country data updated successfully"

    with patch('api.routes.update_country_data', new_callable=AsyncMock) as mock_update:
        mock_update.return_value = mock_update_result

        response = await authenticated_client.put("/update-country/Brazil", json={
            "country": "Brazil",
            "hours": 5,
            "area_of_interest": "Finance"
        })

        assert response.status_code == 200
        assert response.json() == {'status': 'success',
                                   'result': mock_update_result}
        mock_update.assert_called_once()


@pytest.mark.asyncio
async def test_get_country_metrics(authenticated_client):
    mock_metrics = {
        "gdp": 1000000000,
        "population": 200000000,
        "inflation_rate": 2.5
    }

    with patch('api.routes.get_country_metrics', return_value=mock_metrics) as mock_get_metrics:
        response = await authenticated_client.get("/countries/Brazil/metrics")

        assert response.status_code == 200
        assert response.json() == mock_metrics
        mock_get_metrics.assert_called_once_with("Brazil")


@pytest.mark.asyncio
async def test_update_user_interests(authenticated_client):
    new_interests = {
        "Brazil": "Technology",
        "India": "Healthcare"
    }

    response = await authenticated_client.post("/update-user-interests", json=new_interests)

    assert response.status_code == 200
    assert response.json()["message"] == "User interests updated successfully"


@pytest.mark.asyncio
async def test_generate_event_report(authenticated_client):
    mock_country_data = {
        "Brazil": CountryData(
            country="Brazil",
            events=[
                Event(
                    id="event1",
                    title="Test Event",
                    relevance_rationale="Test rationale",
                    relevance_score=5,
                    event_summary="Test summary",
                    articles=[ArticleInfo(
                        summary="Test article", url="http://test.com")]
                )
            ],
            timestamp=datetime.now(),
            hours=3,
            no_relevant_events=1,
            user_id="66fad757a7c3aca4ca322123"
        )
    }
    mock_report_content = "This is a mock event report for Brazil."

    with patch('api.routes.fetch_country_data', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_country_data
        with patch('api.routes.economic_report_event', new_callable=AsyncMock) as mock_report:
            mock_report.return_value = mock_report_content

            response = await authenticated_client.post("/countries/Brazil/events/event1/generate-report")

            assert response.status_code == 200
            assert response.json()["content"] == mock_report_content
            mock_fetch.assert_called_once_with("66fad757a7c3aca4ca322123")
            mock_report.assert_called_once()


@pytest.mark.asyncio
async def test_delete_country_not_found(authenticated_client):
    mock_country_data = {}

    with patch('api.routes.fetch_country_data', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_country_data

        response = await authenticated_client.delete("/countries/Brazil")

        assert response.status_code == 404
        assert response.json()["detail"] == "Country not found"
        mock_fetch.assert_called_once_with("66fad757a7c3aca4ca322123")

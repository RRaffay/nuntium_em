import os
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient
from main import app
from app.tests.utils import create_user

# Set the environment to testing
os.environ["APP_ENV"] = "testing"


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def authenticated_client(event_loop):
    user = await create_user(
        email="test@example.com",
        password="testpassword",
        first_name="Test",
        last_name="User",
        area_of_interest="Technology"
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/auth/jwt/login", data={
            "username": "test@example.com",
            "password": "testpassword"
        })
        token = response.json()["access_token"]
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac

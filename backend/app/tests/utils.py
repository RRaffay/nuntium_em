from auth.auth_db import User
from motor.motor_asyncio import AsyncIOMotorClient
import contextlib
import asyncio
from auth.auth_db import get_user_db
from auth.schemas import UserCreate
from auth.users import get_user_manager
from fastapi_users.exceptions import UserAlreadyExists
from typing import List, Dict
from beanie import init_beanie, Document


client = AsyncIOMotorClient(
    'mongodb://localhost:27017', uuidRepresentation="standard")
db = client['nuntium_users']


get_user_db_context = contextlib.asynccontextmanager(get_user_db)
get_user_manager_context = contextlib.asynccontextmanager(get_user_manager)


async def create_user(email: str,
                      password: str,
                      first_name: str,
                      last_name: str,
                      area_of_interest: str,
                      countries: List[str] = [],
                      country_interests: Dict[str, str] = {},
                      is_superuser: bool = False):
    try:
        await init_beanie(
            database=db,
            document_models=[
                User,
            ],
        )
        async with get_user_db_context() as user_db:
            async with get_user_manager_context(user_db) as user_manager:
                user = await user_manager.create(
                    UserCreate(
                        email=email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                        area_of_interest=area_of_interest,
                        countries=countries,
                        country_interests=country_interests,
                        is_superuser=is_superuser
                    )
                )
                print(f"User created {user}")
                return user
    except UserAlreadyExists:
        print(f"User {email} already exists")
        existing_user = await User.find_one(User.email == email)
        return existing_user


# Example run
if __name__ == "__main__":
    asyncio.run(create_user(
        email="test@test.com",
        password="testing",
        first_name="John",
        last_name="Doe",
        area_of_interest="Technology",
        countries=["USA", "Canada"],
        country_interests={"USA": "Tech industry", "Canada": "Startups"}
    ))

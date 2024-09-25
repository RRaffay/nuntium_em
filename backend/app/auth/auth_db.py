from beanie import Document
from fastapi_users.db import BeanieBaseUser
from fastapi_users_db_beanie import BeanieUserDatabase
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from typing import List

client = AsyncIOMotorClient(settings.MONGO_URI, uuidRepresentation="standard")
db = client[settings.MONGO_AUTH_DB_NAME]


class User(BeanieBaseUser, Document):
    first_name: str
    last_name: str
    area_of_interest: str
    countries: List[str] = []


async def get_user_db():
    yield BeanieUserDatabase(User)

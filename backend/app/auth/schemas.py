from beanie import PydanticObjectId
from fastapi_users import schemas
from typing import Optional


class UserRead(schemas.BaseUser[PydanticObjectId]):
    first_name: str
    last_name: str


class UserCreate(schemas.BaseUserCreate):
    first_name: str
    last_name: str


class UserUpdate(schemas.BaseUserUpdate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

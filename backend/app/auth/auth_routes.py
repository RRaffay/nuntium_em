from fastapi import APIRouter, Depends
from .schemas import UserRead, UserCreate, UserUpdate
from .users import fastapi_users, auth_backend, current_active_user
from .auth_db import User, db

auth_router = APIRouter()

auth_router.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
auth_router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
auth_router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
auth_router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
auth_router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


@auth_router.get("/dashboard-header")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Welcome, {user.first_name}!"}

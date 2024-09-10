import logging
from fastapi import APIRouter, Depends, HTTPException
from .schemas import UserRead, UserCreate, UserUpdate
from .users import fastapi_users, auth_backend, current_active_user
from .auth_db import User

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


@auth_router.get("/user/profile", response_model=UserRead)
async def get_user_profile(user: User = Depends(current_active_user)):
    try:
        logger.info(f"User {user.id} requested their profile")
        return user
    except Exception as e:
        logger.error(f"Error retrieving profile for user {user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@auth_router.put("/user/profile", response_model=UserRead)
async def update_user_profile(
    user_update: UserUpdate,
    user: User = Depends(current_active_user)
):
    try:
        logger.info(f"User {user.id} is updating their profile")
        for field, value in user_update.dict(exclude_unset=True).items():
            setattr(user, field, value)
        await user.save()
        logger.info(f"User {user.id} profile updated successfully")
        return user
    except Exception as e:
        logger.error(f"Error updating profile for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to update user profile")


@auth_router.get("/dashboard-header")
async def authenticated_route(user: User = Depends(current_active_user)):
    try:
        logger.info(
            f"User {user.id} ({user.first_name}) accessed the dashboard header")
        return {"message": f"Welcome, {user.first_name}!"}
    except Exception as e:
        logger.error(
            f"Error accessing dashboard header for user {user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

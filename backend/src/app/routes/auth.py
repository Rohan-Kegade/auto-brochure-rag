from app.db.models import User
from app.db.session import get_db
from app.routes.schemas import (
    AccountDelete,
    AuthResponse,
    LoginRequest,
    PasswordChange,
    ProfileUpdate,
    SignupRequest,
    UserOut,
)
from app.services import auth as auth_service
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])

# auto_error=False so a missing token gets the same 401 as a bad one.
bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Please log in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None:
        raise _unauthorized()
    return credentials.credentials


async def get_current_user(
    token: str = Depends(get_token), db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency for every route that touches a user's data."""
    user = await auth_service.user_for_token(db, token)
    if user is None:
        raise _unauthorized()
    return user


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def sign_up(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be blank.")
    user, token = await auth_service.sign_up(db, body.name, body.email, body.password)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def log_in(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, token = await auth_service.log_in(db, body.email, body.password)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
async def log_out(token: str = Depends(get_token), db: AsyncSession = Depends(get_db)):
    await auth_service.log_out(db, token)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be blank.")
    return await auth_service.update_name(db, user, body.name)


@router.post("/password", status_code=204)
async def change_password(
    body: PasswordChange,
    token: str = Depends(get_token),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(
        db, user, body.current_password, body.new_password, token
    )
    return Response(status_code=204)


@router.delete("/me", status_code=204)
async def delete_me(
    body: AccountDelete,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.delete_account(db, user, body.password)
    return Response(status_code=204)

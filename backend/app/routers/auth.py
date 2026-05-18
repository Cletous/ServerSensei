from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import AuthResponse, UserLoginRequest, UserRegisterRequest

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=AuthResponse)
def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == request.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role="admin"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role
        }
    )

    return AuthResponse(access_token=access_token)

@router.post("/login", response_model=AuthResponse)
def login_user(
    request: UserLoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == request.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role
        }
    )

    return AuthResponse(access_token=access_token)
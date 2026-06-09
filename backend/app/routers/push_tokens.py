from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.push_token import PushToken
from app.models.user import User
from app.schemas.push_token import (
    PushTokenRegisterRequest,
    PushTokenResponse,
)

router = APIRouter(
    prefix="/push-tokens",
    tags=["Push Tokens"]
)

@router.post("", response_model=PushTokenResponse)
def register_push_token(
    request: PushTokenRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_token = db.query(PushToken).filter(
        PushToken.token == request.token
    ).first()

    if existing_token:
        existing_token.user_id = current_user.id
        existing_token.platform = request.platform
        existing_token.active = True

        db.commit()
        db.refresh(existing_token)

        return existing_token

    push_token = PushToken(
        user_id=current_user.id,
        token=request.token,
        platform=request.platform,
        active=True
    )

    db.add(push_token)
    db.commit()
    db.refresh(push_token)

    return push_token
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User
from app.core.security import hash_password
from app.schemas.user import (
    UserCreateRequest,
    UserResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
)
from app.services.audit_service import create_audit_log

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users"]
)

ALLOWED_ROLES = ["admin", "operator", "viewer"]

DEFAULT_ADMIN_CREATED_USER_PASSWORD = "Pass@123"

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    role = request.role.lower().strip()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be admin, operator, or viewer"
        )

    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name is required"
        )

    existing_user = db.query(User).filter(
        User.email == request.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    password = request.password or DEFAULT_ADMIN_CREATED_USER_PASSWORD

    user = User(
        name=name,
        email=request.email,
        password_hash=hash_password(password),
        role=role,
        active=True,
    )

    db.add(user)
    db.flush()

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="USER_CREATED",
        entity_type="user",
        entity_id=user.id,
        description=(
            f"Admin {current_user.email} created user {user.email} "
            f"with role {user.role}"
        ),
        details={
            "target_user_id": user.id,
            "target_user_name": user.name,
            "target_user_email": user.email,
            "target_user_role": user.role,
        },
    )

    db.commit()
    db.refresh(user)

    return user
    
@router.get("", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    request: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if request.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be admin, operator, or viewer"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == current_user.id and request.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role"
        )

    old_role = user.role
    user.role = request.role

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="USER_ROLE_CHANGED",
        entity_type="user",
        entity_id=user.id,
        description=(
            f"Admin {current_user.email} changed user {user.email} "
            f"role from {old_role} to {request.role}"
        ),
        details={
            "target_user_id": user.id,
            "target_user_email": user.email,
            "old_role": old_role,
            "new_role": request.role,
        },
    )

    db.commit()
    db.refresh(user)

    return user

@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    request: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == current_user.id and request.active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own account"
        )

    old_status = user.active
    user.active = request.active

    audit_action = "USER_ENABLED" if request.active else "USER_DISABLED"

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action=audit_action,
        entity_type="user",
        entity_id=user.id,
        description=(
            f"Admin {current_user.email} changed user {user.email} "
            f"active status from {old_status} to {request.active}"
        ),
        details={
            "target_user_id": user.id,
            "target_user_email": user.email,
            "old_active": old_status,
            "new_active": request.active,
        },
    )

    db.commit()
    db.refresh(user)

    return user
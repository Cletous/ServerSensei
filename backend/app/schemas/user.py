from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserResponse(BaseModel):
    id: int
    name: str | None = None
    email: EmailStr
    role: str
    active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    role: str
    password: str | None = None

class UserRoleUpdateRequest(BaseModel):
    role: str

class UserStatusUpdateRequest(BaseModel):
    active: bool
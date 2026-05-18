from pydantic import BaseModel, EmailStr

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
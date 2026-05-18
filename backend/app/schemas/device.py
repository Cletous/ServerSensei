from pydantic import BaseModel

class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_name: str
    location: str | None = None

class DeviceResponse(BaseModel):
    id: int
    device_id: str
    device_name: str
    location: str | None
    mode: str
    online: bool

    class Config:
        from_attributes = True
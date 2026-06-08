from fastapi import FastAPI
from app.core.config import settings
from app.core.database import Base, engine
from app.models import (
    user,
    device,
    sensor_reading,
    device_status,
    command,
    alert,
    power_status,
    device_setting,
)
from app.routers import alerts, auth, commands, devices, power, telemetry, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION
)

@app.get("/")
def root():
    return {
        "message": "ServerSensei Backend is running",
        "version": settings.APP_VERSION
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ServerSensei Backend"
    }

app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(devices.router)
app.include_router(power.router)
app.include_router(telemetry.router)
app.include_router(commands.router)
app.include_router(settings.router)
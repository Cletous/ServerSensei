from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings as app_settings
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
from app.routers import alerts, auth, commands, devices, decision, power, telemetry
from app.routers import settings as settings_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=app_settings.APP_NAME,
    version=app_settings.APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "ServerSensei Backend is running",
        "version": app_settings.APP_VERSION
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
app.include_router(settings_router.router)
app.include_router(decision.router)
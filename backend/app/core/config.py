from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "ServerSensei Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    EMAIL_ALERTS_ENABLED: bool = False
    EMAIL_ALERT_MIN_SEVERITY: str = "warning"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""

    ALERT_RECIPIENT_EMAILS: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
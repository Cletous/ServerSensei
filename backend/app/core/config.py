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

    MAIL_MAILER: str = "smtp"
    MAIL_HOST: str = ""
    MAIL_PORT: int = 465
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_ENCRYPTION: str = "ssl"
    MAIL_FROM_ADDRESS: str = ""
    MAIL_FROM_NAME: str = "ServerSensei"

    ALERT_RECIPIENT_EMAILS: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
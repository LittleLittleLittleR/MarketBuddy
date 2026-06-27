from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # brightdata stuff
    BRIGHTDATA_API_TOKEN: str
    BRIGHTDATA_SERP_ZONE: str = "serp_api1"

    # llms api key
    OPENAI_API_KEY: str

    # fastapi stuff
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # supabase
    SUPABASE_URL: str
    SUPABASE_SECRET_KEY: str

    # upstash redis
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str

    # debug
    DEBUG: bool = False

    # class Config:
    #   env_file = ".env"
    #

    # resend email
    RESEND_API_KEY: str
    RESEND_FROM_EMAIL: str
    ADMIN_SECRET: str

    # S3 AWS
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str
    S3_BUCKET: str

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_comma_separated_list(cls, v: any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        raise ValueError("Invalid format for ALLOWED_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


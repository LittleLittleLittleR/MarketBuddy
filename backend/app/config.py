from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # brightdata stuff
    brightdata_api_token: str
    BRIGHTDATA_SERP_ZONE: str = "serp_api1"

    # llms api key
    openai_api_key: str

    # fastapi stuff
    allowed_origins: list[str] = ["http://localhost:3000"]

    # supabase
    supabase_url: str
    supabase_secret_key: str

    # upstash redis
    upstash_redis_rest_url: str
    upstash_redis_rest_token: str

    # debug
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
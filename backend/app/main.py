from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import analysis, tickers

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins)
app.include_router(analysis.router)
app.include_router(tickers.router)


@app.get("/")
def read_root():
    return {"root": "welcome to MarketBuddy"}

# MarketBuddy

A containerized web application that automates stock market data collection and provides users with concise, daily performance summaries.

## Backend Setup (Virtual Env)

```bash
(backend folder): .\venv\Scripts\Activate
(venv) (backend folder): pip install -r requirements.txt
```

## Usage

```bash
uvicorn app.main:app --reload
```

## Architecture

`main.py` is the entry file for FastAPI Server

`/services` for services with functionalities specific to service

`/routers` to group routing for similar endpoints

`/dependencies` for class objects - use `Depends` when passing as params

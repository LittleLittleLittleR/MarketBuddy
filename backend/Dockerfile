FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# test stage
FROM base AS test
RUN pip install --no-cache-dir pytest pytest-cov pytest-asyncio time-machine
COPY tests ./tests
CMD python -m pytest -v --cov=app --cov-report=term-missing

# production stage
FROM base AS production
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1

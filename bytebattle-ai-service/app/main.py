from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request

from app.core.config import setup_logging
from app.routes.analyze import router as analyze_router
from app.routes.predictions import router as predictions_router
from app.routes.recommendations import router as recommendations_router
from app.routes.matchmaking import router as matchmaking_router
from app.routes.analytics import router as analytics_router


setup_logging()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ByteBattle AI Service",
    description="Advanced ML-powered analytics, predictions, and recommendations",
    version="1.0.0",
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Simple request logging middleware for basic observability.

    Captures method, path, status code, and latency for every request.
    """

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    logger.info(
        "request completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )

    return response


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "ByteBattle AI Service"}


# Include all routers
app.include_router(analyze_router)
app.include_router(predictions_router)
app.include_router(recommendations_router)
app.include_router(matchmaking_router)
app.include_router(analytics_router)


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "ByteBattle AI Service",
        "version": "1.0.0",
        "endpoints": {
            "predictions": "/api/predictions",
            "recommendations": "/api/recommendations",
            "matchmaking": "/api/matchmaking",
            "analytics": "/api/analytics",
        },
        "docs": "/docs",
    }



from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request

from app.core.config import setup_logging
from app.routes.analyze import router as analyze_router

setup_logging()

logger = logging.getLogger(__name__)

app = FastAPI(title="ByteBattle AI Service")

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

# ✅ ADD THIS ROOT ENDPOINT
@app.get("/", tags=["System"])
async def root():
    return {
        "service": "ByteBattle AI Coach",
        "status": "operational",
        "endpoints": [
            "GET /health",
            "GET /",
            "POST /ai/analyze-code",
            "POST /ai/code/analyze"
        ]
    }

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}

app.include_router(analyze_router)

# Add this for Render compatibility
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
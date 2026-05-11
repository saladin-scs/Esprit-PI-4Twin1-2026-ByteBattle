from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware  # ✅ ADD THIS

from app.core.config import setup_logging
from app.routes.analyze import router as analyze_router

setup_logging()

logger = logging.getLogger(__name__)

app = FastAPI(title="ByteBattle AI Service")

# CORS — allow any origin so Vercel previews and local dev ports work without allow-listing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
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

@app.get("/")
async def root():
    return {
        "service": "ByteBattle AI Coach",
        "status": "running",
        "endpoints": ["/health", "/ai/analyze-code", "/ai/code/analyze"]
    }

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}

app.include_router(analyze_router)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
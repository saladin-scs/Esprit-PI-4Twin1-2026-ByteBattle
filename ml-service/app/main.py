import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import recommend
from app.recommender.model_loader import load_artifacts
from app.recommender.engine import RecommenderEngine
import logging

# =========================
# Logging setup
# =========================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =========================
# App initialization
# =========================
app = FastAPI(
    title="ByteBattle Recommendation Service",
    description="Production-ready ML microservice for personalized coding challenges",
    version="2.0.0"
)

# =========================
# CORS
# =========================
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Global state (safe init)
# =========================
app.state.recommendation_service = None

# =========================
# Startup event (FIXED)
# =========================
@app.on_event("startup")
async def startup_event():

    from app.services.recommendation_service import RecommendationService

    try:
        # Fixed path: look in parent of 'app' directory (ml-service root)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "models", "recommender_artifacts.pkl")

        logger.info(f"Loading model from: {model_path}")

        if os.path.exists(model_path):
            artifacts = load_artifacts(model_path)
            engine = RecommenderEngine(artifacts)

            app.state.recommendation_service = RecommendationService(engine)

            logger.info("✅ Recommendation engine loaded successfully")

        else:
            logger.warning("⚠️ Model file not found. Running fallback mode.")
            app.state.recommendation_service = RecommendationService(None)

    except Exception as e:
        logger.exception("🔥 FATAL ERROR during recommender initialization")
        raise e  # IMPORTANT: DO NOT HIDE CRASH

# =========================
# Health check
# =========================
@app.get("/health")
async def health_check():
    service = getattr(app.state, "recommendation_service", None)

    return {
        "status": "healthy",
        "engine_ready": service is not None and service.engine is not None
    }

# =========================
# Routes
# =========================
app.include_router(recommend.router)

# =========================
# Local dev entrypoint
# =========================
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8001))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port
    )
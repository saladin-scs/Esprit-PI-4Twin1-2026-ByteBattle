import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import recommend
from app.recommender.model_loader import load_artifacts
from app.recommender.engine import RecommenderEngine
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ByteBattle Recommendation Service",
    description="Production-ready ML microservice for personalized coding challenges",
    version="2.0.0"
)

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    model_path = os.getenv("ML_MODEL_PATH", "./models/recommender_artifacts.pkl")
    try:
        logger.info(f"Loading model artifacts from {model_path}...")
        from app.services.recommendation_service import RecommendationService
        
        if os.path.exists(model_path):
            artifacts = load_artifacts(model_path)
            engine = RecommenderEngine(artifacts)
            app.state.recommendation_service = RecommendationService(engine)
            logger.info("Recommendation engine initialized successfully.")
        else:
            logger.warning(f"Model artifacts not found at {model_path}. Starting with empty service.")
            app.state.recommendation_service = RecommendationService(None)
    except Exception as e:
        logger.error(f"Failed to initialize recommendation service: {e}")
        from app.services.recommendation_service import RecommendationService
        app.state.recommendation_service = RecommendationService(None)


@app.get("/health")
async def health_check():
    service = getattr(app.state, 'recommendation_service', None)
    return {
        "status": "healthy",
        "engine_ready": service is not None and service.engine is not None
    }

# Include routers
app.include_router(recommend.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", 8001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

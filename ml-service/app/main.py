import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.recommender.model_loader import load_recommender_artifacts
from app.recommender.engine import RecommenderEngine
from app.routes.recommend import router as recommend_router

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
)
logger = logging.getLogger('ml-service')

ML_MODEL_PATH = os.environ.get('ML_MODEL_PATH', './models/recommender_artifacts.pkl')
ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get('ALLOWED_ORIGINS', '*').split(',') if origin.strip()]

app = FastAPI(title='ByteBattle Recommender API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.on_event('startup')
async def startup_event() -> None:
    artifacts = load_recommender_artifacts(ML_MODEL_PATH)
    app.state.recommender = RecommenderEngine(artifacts)
    logger.info('Recommender artifacts loaded from %s', ML_MODEL_PATH)

@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}

app.include_router(recommend_router)

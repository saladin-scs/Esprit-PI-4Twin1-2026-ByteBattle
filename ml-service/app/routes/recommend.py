from fastapi import APIRouter, HTTPException, Request
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse

router = APIRouter(prefix='/recommend', tags=['recommend'])

@router.post('/', response_model=RecommendationResponse)
async def recommend(request_data: RecommendationRequest, request: Request) -> RecommendationResponse:
    engine = getattr(request.app.state, 'recommender', None)
    if engine is None:
        raise HTTPException(status_code=503, detail='Recommender engine is not ready')

    return {
        'challenges': engine.recommend(request_data.userId, request_data.limit),
    }

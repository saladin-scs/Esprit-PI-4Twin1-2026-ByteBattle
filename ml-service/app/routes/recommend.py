from fastapi import APIRouter, HTTPException, Request, Query
from app.schemas.recommendation import RecommendationResponse, ErrorResponse
from typing import Optional

router = APIRouter(prefix='/recommendations', tags=['recommendations'])

@router.get('/user/{user_id}', response_model=RecommendationResponse)
async def get_user_recommendations(
    user_id: str, 
    limit: int = Query(8, ge=1, le=50),
    request: Request = None
) -> RecommendationResponse:
    """
    Get personalized challenge recommendations for a specific user.
    """
    service = getattr(request.app.state, 'recommendation_service', None)
    if service is None or service.engine is None:
        raise HTTPException(status_code=503, detail='Recommendation service is not ready')

    recommendations = service.get_user_recommendations(user_id, limit=limit)
    return {
        'challenges': recommendations,
        'status': 'success',
        'metadata': {'user_id': user_id, 'limit': limit}
    }

@router.get('/item/{item_id}', response_model=RecommendationResponse)
async def get_item_similarities(
    item_id: str, 
    limit: int = Query(5, ge=1, le=20),
    request: Request = None
) -> RecommendationResponse:
    """
    Get challenges similar to a specific challenge.
    """
    service = getattr(request.app.state, 'recommendation_service', None)
    if service is None or service.engine is None:
        raise HTTPException(status_code=503, detail='Recommendation service is not ready')

    similar_items = service.get_item_similarities(item_id, limit=limit)
    return {
        'challenges': similar_items,
        'status': 'success',
        'metadata': {'item_id': item_id, 'limit': limit}
    }

@router.post('/refresh')
async def refresh_model(request: Request):
    """
    Trigger a reload of the ML artifacts from disk.
    """
    service = getattr(request.app.state, 'recommendation_service', None)
    if service is None:
        raise HTTPException(status_code=503, detail='Recommendation service is not initialized')

    try:
        model_path = os.getenv('ML_MODEL_PATH', './models/recommender_artifacts.pkl')
        service.reload_model(model_path)
        return {'status': 'success', 'message': 'Model artifacts reloaded successfully'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to reload model: {str(e)}')

"""Recommendation API endpoints"""

from fastapi import APIRouter, HTTPException
from app.schemas import RecommendationRequest, RecommendationResponse, ChallengeRecommendation
from app.ml.recommendations import RecommendationEngine
import pandas as pd
from datetime import datetime
import logging

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])
logger = logging.getLogger(__name__)

# Global recommendation engine
recommendation_engine = RecommendationEngine()


@router.post("/challenges", response_model=RecommendationResponse)
async def get_challenge_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    """
    Get personalized challenge recommendations for a user

    Uses collaborative filtering based on similar users' performance
    """
    try:
        n_recs = request.n_recommendations

        # Get recommendations from engine
        recs = recommendation_engine.recommend_challenges(
            request.user_id, n_similar=5, n_recommendations=n_recs
        )

        if not recs:
            logger.warning(f"No recommendations found for user {request.user_id}")
            recs = []

        # Convert to response format
        recommendations = [
            ChallengeRecommendation(
                challenge_id=str(rec.get("contestId", "")),
                challenge_name=rec.get("name", "Challenge"),
                score=float(rec.get("score", 0)),
                reason="Based on similar users' performance",
                difficulty=rec.get("difficulty", "Medium"),
                estimated_success_rate=None,
            )
            for rec in recs
        ]

        response = RecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            generated_at=datetime.utcnow().isoformat(),
        )

        logger.info(f"Generated {len(recommendations)} recommendations for {request.user_id}")
        return response

    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/similar-users/{user_id}")
async def get_similar_users(user_id: str, n_similar: int = 5) -> dict:
    """Get users similar to the specified user"""
    try:
        similar_users = recommendation_engine.get_similar_users(user_id, n_similar=n_similar)

        return {
            "user_id": user_id,
            "similar_users": similar_users,
            "count": len(similar_users),
        }

    except Exception as e:
        logger.error(f"Error getting similar users: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rebuild-matrix")
async def rebuild_recommendation_matrix(challenge_data: dict) -> dict:
    """
    Rebuild user-challenge recommendation matrix from fresh data

    Should be called periodically or when new contest data arrives
    """
    try:
        # Convert dict data to DataFrame
        df = pd.DataFrame(challenge_data.get("data", []))

        if df.empty:
            raise ValueError("No data provided")

        # Build matrix
        matrix = recommendation_engine.build_user_contest_matrix(df)

        # Compute similarities
        sim_df = recommendation_engine.compute_user_similarity(n_users=1000)

        return {
            "status": "success",
            "matrix_shape": matrix.shape,
            "similarity_shape": sim_df.shape,
            "users_count": matrix.shape[0],
            "contests_count": matrix.shape[1],
        }

    except Exception as e:
        logger.error(f"Matrix rebuild error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

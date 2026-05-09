"""Prediction API endpoints"""

from fastapi import APIRouter, HTTPException
from app.schemas import PredictionRequest, PredictionResponse
from app.ml.models import MLModelEnsemble
from app.ml.data_processor import DataProcessor
import numpy as np
import logging

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])
logger = logging.getLogger(__name__)

# Global model instance
model_ensemble = MLModelEnsemble()
data_processor = DataProcessor()


@router.post("/performance", response_model=PredictionResponse)
async def predict_performance(request: PredictionRequest) -> PredictionResponse:
    """
    Predict user's success probability on a challenge

    Returns:
        - success_probability: 0-1 chance of success
        - difficulty_rating: Challenge difficulty estimation
        - model_used: Which model made the prediction
        - confidence: Model's confidence in prediction
    """
    try:
        # Extract features from request
        features_list = list(request.user_features.values())
        if len(features_list) == 0:
            raise ValueError("No user features provided")

        X = np.array([features_list])

        # Make prediction
        predictions, probabilities = model_ensemble.predict(X, model_name="rf")

        success_prob = float(probabilities[0])
        confidence = max(success_prob, 1 - success_prob)

        # Estimate difficulty based on challenge features
        difficulty_features = request.challenge_features
        difficulty_score = difficulty_features.get("difficulty_level", 5.0)

        # Estimate time based on complexity
        estimated_time = int(difficulty_score * 5)  # Simple heuristic

        response = PredictionResponse(
            user_id=request.user_id,
            challenge_id=request.challenge_id,
            success_probability=success_prob,
            difficulty_rating=float(difficulty_score),
            estimated_time_minutes=estimated_time,
            model_used="random_forest",
            confidence=confidence,
        )

        logger.info(
            f"Prediction: {request.user_id} -> {request.challenge_id}: "
            f"{success_prob:.2%} success"
        )
        return response

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch")
async def batch_predict(requests: list[PredictionRequest]) -> dict:
    """
    Batch predict performance for multiple users/challenges

    Useful for leaderboard generation and batch analytics
    """
    try:
        results = []
        for req in requests:
            features_list = list(req.user_features.values())
            X = np.array([features_list])
            predictions, probabilities = model_ensemble.predict(X, model_name="rf")

            results.append(
                {
                    "user_id": req.user_id,
                    "challenge_id": req.challenge_id,
                    "success_probability": float(probabilities[0]),
                }
            )

        logger.info(f"Batch prediction completed for {len(requests)} items")
        return {"predictions": results, "count": len(results)}

    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/model-performance")
async def get_model_performance() -> dict:
    """Get performance metrics of trained models"""
    return {
        "models_available": list(model_ensemble.models.keys()),
        "status": "ready" if len(model_ensemble.models) > 0 else "not_trained",
        "description": "ML models for performance prediction",
    }

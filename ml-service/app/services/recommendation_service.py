from typing import List, Dict, Any, Optional
from app.recommender.engine import RecommenderEngine
import logging

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self, engine: Optional[RecommenderEngine]):
        self.engine = engine

    def get_user_recommendations(self, user_id: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Orchestrates user-based recommendations with enrichment if necessary.
        """
        if not self.engine:
            logger.warning("Recommendation engine not initialized. Returning empty.")
            return []
        
        try:
            return self.engine.recommend(user_id, n_recommendations=limit)
        except Exception as e:
            logger.error(f"Error getting user recommendations: {e}")
            return []

    def get_item_similarities(self, item_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Orchestrates item-item similarities.
        """
        if not self.engine:
            return []
            
        try:
            return self.engine.get_item_similarities(item_id, n_similar=limit)
        except Exception as e:
            logger.error(f"Error getting item similarities: {e}")
            return []

    def reload_model(self, model_path: str):
        """
        Handles the model reload logic.
        """
        from app.recommender.model_loader import load_artifacts
        artifacts = load_artifacts(model_path)
        self.engine = RecommenderEngine(artifacts)
        logger.info("Model reloaded successfully.")

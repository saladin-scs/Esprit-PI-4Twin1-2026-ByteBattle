"""Clustering and Matchmaking API endpoints"""

from fastapi import APIRouter, HTTPException
from app.schemas import ClusteringRequest, ClusteringResponse, MatchmakingRequest, MatchmakingResponse, MatchSuggestion
from app.ml.clustering import UserClustering
import numpy as np
import logging

router = APIRouter(prefix="/api/matchmaking", tags=["Matchmaking"])
logger = logging.getLogger(__name__)

# Global clustering instance
user_clustering = UserClustering()


@router.post("/cluster", response_model=ClusteringResponse)
async def cluster_users(request: ClusteringRequest) -> ClusteringResponse:
    """
    Cluster users for matchmaking and skill grouping

    Supports both K-Means and DBSCAN algorithms
    """
    try:
        if not request.user_features:
            raise ValueError("No user features provided")

        # Convert features to numpy array
        X = np.array(request.user_features)

        # Fit clustering
        if request.algorithm == "kmeans":
            result = user_clustering.fit_kmeans(X, n_clusters=3)
        elif request.algorithm == "dbscan":
            result = user_clustering.fit_dbscan(X)
        else:
            raise ValueError(f"Unknown algorithm: {request.algorithm}")

        # Create user-to-cluster mapping
        user_clusters = {
            uid: int(user_clustering.cluster_labels[i])
            for i, uid in enumerate(request.user_ids)
        }

        response = ClusteringResponse(
            algorithm=request.algorithm,
            n_clusters=result["n_clusters"],
            user_clusters=user_clusters,
            cluster_distribution={
                str(k): v for k, v in result.get("distribution", {}).items()
            },
        )

        logger.info(f"Clustered {len(request.user_ids)} users with {request.algorithm}")
        return response

    except Exception as e:
        logger.error(f"Clustering error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/suggestions", response_model=MatchmakingResponse)
async def get_matchup_suggestions(request: MatchmakingRequest) -> MatchmakingResponse:
    """
    Get suggested opponents for a user based on skill similarity

    Uses clustering to find players with similar skill levels
    """
    try:
        features = np.array(list(request.user_features.values()))

        # Get cluster and members
        suggestions_ids = user_clustering.suggest_matchup(
            request.user_id, features, request.available_users, n_suggestions=request.n_suggestions
        )

        # Create suggestions with compatibility scores
        suggestions = [
            MatchSuggestion(
                opponent_id=opponent_id,
                compatibility_score=0.85,  # Can be calculated from similarity
                reason="Similar skill level and rating",
            )
            for opponent_id in suggestions_ids
        ]

        response = MatchmakingResponse(
            user_id=request.user_id,
            suggestions=suggestions,
        )

        logger.info(f"Generated {len(suggestions)} matchup suggestions for {request.user_id}")
        return response

    except Exception as e:
        logger.error(f"Matchmaking error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cluster-info/{user_id}")
async def get_user_cluster_info(user_id: str, user_features: dict) -> dict:
    """Get cluster information for a specific user"""
    try:
        features = np.array(list(user_features.values()))
        cluster_id = user_clustering.get_user_cluster(features)

        return {
            "user_id": user_id,
            "cluster_id": cluster_id,
            "interpretation": f"Skill tier {cluster_id}",
        }

    except Exception as e:
        logger.error(f"Error getting cluster info: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

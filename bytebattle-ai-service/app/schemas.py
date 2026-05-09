"""API Request/Response Schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# Prediction Schemas
class PredictionRequest(BaseModel):
    """Request for performance prediction"""
    user_id: str
    challenge_id: str
    user_features: Dict[str, Any] = Field(..., description="User profile data")
    challenge_features: Dict[str, Any] = Field(..., description="Challenge metadata")


class PredictionResponse(BaseModel):
    """Prediction model output"""
    user_id: str
    challenge_id: str
    success_probability: float = Field(..., ge=0, le=1)
    difficulty_rating: Optional[float] = None
    estimated_time_minutes: Optional[int] = None
    model_used: str = "random_forest"
    confidence: float = Field(..., ge=0, le=1)


# Recommendation Schemas
class RecommendationRequest(BaseModel):
    """Request for challenge recommendations"""
    user_id: str
    n_recommendations: int = Field(5, ge=1, le=20)
    preferred_difficulty: Optional[str] = None


class ChallengeRecommendation(BaseModel):
    """Individual challenge recommendation"""
    challenge_id: str
    challenge_name: str
    score: float
    reason: str
    difficulty: str
    estimated_success_rate: Optional[float] = None


class RecommendationResponse(BaseModel):
    """List of recommendations"""
    user_id: str
    recommendations: List[ChallengeRecommendation]
    generated_at: str


# Clustering Schemas
class ClusteringRequest(BaseModel):
    """Request for user clustering"""
    user_ids: List[str]
    user_features: List[Dict[str, Any]]
    algorithm: str = "kmeans"  # kmeans or dbscan


class ClusteringResponse(BaseModel):
    """Clustering results"""
    algorithm: str
    n_clusters: int
    user_clusters: Dict[str, int]  # user_id -> cluster_id
    cluster_distribution: Dict[str, int]  # cluster_id -> count


# Matchmaking Schemas
class MatchmakingRequest(BaseModel):
    """Request for matchmaking"""
    user_id: str
    user_features: Dict[str, Any]
    available_users: List[str]
    n_suggestions: int = Field(3, ge=1, le=10)


class MatchSuggestion(BaseModel):
    """Suggested opponent"""
    opponent_id: str
    compatibility_score: float
    reason: str


class MatchmakingResponse(BaseModel):
    """Matchmaking suggestions"""
    user_id: str
    suggestions: List[MatchSuggestion]


# Analytics Schemas
class UserAnalyticsRequest(BaseModel):
    """Request for user analytics"""
    user_id: str
    time_period_days: int = 30


class UserPerformanceMetrics(BaseModel):
    """User performance statistics"""
    user_id: str
    success_rate: float
    average_difficulty: float
    skill_level: str
    improvement_trend: str
    recommended_focus_areas: List[str]


class AnalyticsResponse(BaseModel):
    """Complete analytics response"""
    user_id: str
    metrics: UserPerformanceMetrics
    similar_users: List[Dict[str, Any]]
    skill_cluster: int


# Model Training Schemas
class TrainingRequest(BaseModel):
    """Request to train ML models"""
    data_source: str  # mongodb or csv_path
    retrain_force: bool = False


class TrainingResponse(BaseModel):
    """Training completion response"""
    status: str  # training, completed, failed
    models_trained: List[str]
    accuracy_scores: Dict[str, float]
    message: str

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RecommendationRequest(BaseModel):
    userId: str = Field(..., description='User handle or identifier to score')
    limit: int = Field(8, ge=1, le=50, description='Maximum number of recommendations to return')

class ItemSimilarityRequest(BaseModel):
    itemId: str = Field(..., description='Item identifier to find similarities for')
    limit: int = Field(5, ge=1, le=20, description='Number of similar items to return')

class RecommendationItem(BaseModel):
    itemId: str
    score: float
    title: Optional[str] = None
    difficulty: Optional[str] = None
    tags: List[str] = []
    xpReward: Optional[int] = None
    languages: List[str] = []

class RecommendationResponse(BaseModel):
    challenges: List[RecommendationItem]
    status: str = "success"
    metadata: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    detail: str
    status: str = "error"

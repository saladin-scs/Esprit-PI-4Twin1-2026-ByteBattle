from typing import List, Optional
from pydantic import BaseModel, Field

class RecommendationRequest(BaseModel):
    userId: str = Field(..., description='User handle or identifier to score')
    limit: int = Field(8, ge=1, le=50, description='Maximum number of recommendations to return')

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

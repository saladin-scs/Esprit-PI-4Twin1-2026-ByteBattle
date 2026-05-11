from fastapi import APIRouter
from app.models.schemas import CodeAnalysisRequest
from app.services.feedback_engine import FeedbackRequest, get_feedback_engine

router = APIRouter(prefix="/ai", tags=["AI"])

engine = get_feedback_engine()

@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """Original endpoint"""
    # Your existing logic here
    pass

@router.post("/code/analyze")  # ✅ THIS IS WHAT YOUR FRONTEND CALLS
def analyze_code_alias(request: CodeAnalysisRequest):
    """Alias for frontend - supports /ai/code/analyze"""
    return analyze_code(request)
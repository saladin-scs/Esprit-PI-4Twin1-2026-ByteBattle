import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

# Define the request model
class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "python"
    testsPassed: Optional[bool] = None
    testsPassedCount: Optional[int] = None
    testsTotal: Optional[int] = None
    executionError: Optional[str] = None
    runtimeMs: Optional[float] = None
    taskDescription: Optional[str] = None

@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """Simple AI analysis endpoint - always returns valid JSON"""
    
    logger.info(f"Received request for language: {request.language}")
    
    # Calculate score based on test results
    score = 50
    if request.testsPassed is True:
        score = 85
    elif request.testsPassed is False:
        score = 45
    
    # Build summary
    if request.testsPassed:
        summary = f"✅ Great work! Your {request.language} code passes the tests."
    else:
        summary = f"📝 Your {request.language} code needs some work. Keep debugging!"
    
    # Build points list
    points = []
    
    if request.testsPassedCount is not None and request.testsTotal is not None:
        points.append({
            "title": "Test Results",
            "description": f"Passed {request.testsPassedCount}/{request.testsTotal} tests",
            "category": "testing",
            "severity": "medium" if request.testsPassedCount < request.testsTotal else "low"
        })
    
    if request.executionError:
        points.append({
            "title": "Execution Error",
            "description": request.executionError[:200],
            "category": "error",
            "severity": "high"
        })
    
    if request.runtimeMs and request.runtimeMs > 1000:
        points.append({
            "title": "Performance Note",
            "description": f"Runtime: {request.runtimeMs}ms. Consider optimizations.",
            "category": "performance",
            "severity": "medium"
        })
    
    # Always add a general analysis point
    points.append({
        "title": "Code Analysis",
        "description": f"Your {request.language} code has been analyzed. Review the feedback above for improvements.",
        "category": "info",
        "severity": "low"
    })
    
    # Build the response - MUST be a dictionary
    response = {
        "overall_score": score,
        "summary": summary,
        "points": points,
        "extra": {
            "language": request.language,
            "analyzed_at": "2026-05-11",
            "service": "bytebattle-ai"
        }
    }
    
    logger.info(f"Returning response with score: {score}")
    return response
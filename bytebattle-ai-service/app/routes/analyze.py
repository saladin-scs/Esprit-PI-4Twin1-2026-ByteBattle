import logging
import time
from fastapi import APIRouter
from app.models.schemas import CodeAnalysisRequest
from app.services.feedback_engine import FeedbackRequest, get_feedback_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

engine = get_feedback_engine()

@router.post("/code/analyze")
@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """AI Code Analysis endpoint - supports both URLs"""
    started = time.perf_counter()
    
    # Convert frontend boolean to integer for feedback engine
    tests_passed_value = 0
    if request.testsPassed is not None:
        tests_passed_value = 1 if request.testsPassed else 0
    elif request.tests_passed is not None:
        tests_passed_value = request.tests_passed
    
    # Get execution error from whichever field is provided
    execution_error = request.executionError or request.execution_error
    
    # Get runtime from whichever field is provided
    runtime_ms = request.runtimeMs or request.runtime_ms or 0
    
    feedback_request = FeedbackRequest(
        code=request.code,
        language=request.language,
        tests_passed=tests_passed_value,
        execution_error=execution_error,
        runtime_ms=runtime_ms,
        memory_kb=None,
        task_description=request.taskDescription or request.task_description
    )
    
    feedback_result = engine.generate_feedback(feedback_request)
    
    duration_ms = (time.perf_counter() - started) * 1000
    
    logger.info(
        "analyze_code completed",
        extra={
            "language": request.language,
            "tests_passed": tests_passed_value,
            "has_error": bool(execution_error),
            "score": feedback_result.overall_score,
            "duration_ms": round(duration_ms, 2),
        },
    )
    
    return {
        "overall_score": feedback_result.overall_score,
        "summary": feedback_result.summary,
        "points": [
            {
                "title": p.title,
                "description": p.description,
                "category": p.category,
                "severity": p.severity,
            }
            for p in feedback_result.points
        ],
        "extra": feedback_result.extra,
    }
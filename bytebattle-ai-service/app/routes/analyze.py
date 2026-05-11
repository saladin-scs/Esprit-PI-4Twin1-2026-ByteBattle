import logging
import time
from fastapi import APIRouter, HTTPException
from app.models.schemas import CodeAnalysisRequest
from app.services.feedback_engine import FeedbackRequest, get_feedback_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

try:
    engine = get_feedback_engine()
    logger.info("✅ Feedback engine loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load feedback engine: {str(e)}")
    engine = None

@router.post("/code/analyze")
@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """AI Code Analysis endpoint - supports both URLs"""
    started = time.perf_counter()
    
    # Log the incoming request
    logger.info(f"📥 Received request: language={request.language}, testsPassed={request.testsPassed}")
    
    # Check if engine is available
    if engine is None:
        logger.error("❌ Feedback engine is not available")
        return {
            "overall_score": 75,
            "summary": "AI Coach is temporarily unavailable. Please try again later.",
            "points": [],
            "extra": {"error": "Engine not loaded"}
        }
    
    try:
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
        
        logger.info("🔄 Calling generate_feedback...")
        feedback_result = engine.generate_feedback(feedback_request)
        logger.info(f"✅ generate_feedback returned: score={feedback_result.overall_score if feedback_result else 'None'}")
        
        if feedback_result is None:
            logger.error("❌ feedback_result is None")
            return {
                "overall_score": 70,
                "summary": "Analysis completed but returned no data.",
                "points": [],
                "extra": {}
            }
        
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
                for p in (feedback_result.points or [])
            ],
            "extra": feedback_result.extra or {},
        }
        
    except Exception as e:
        logger.error(f"❌ Error in analyze_code: {str(e)}", exc_info=True)
        return {
            "overall_score": 60,
            "summary": f"Analysis error: {str(e)[:200]}",
            "points": [],
            "extra": {"error": str(e)}
        }
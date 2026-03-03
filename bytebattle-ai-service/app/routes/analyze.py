import logging
import time

from fastapi import APIRouter

from app.models.schemas import CodeAnalysisRequest
from app.services.feedback_engine import FeedbackRequest, get_feedback_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

engine = get_feedback_engine()


@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """
    Analyze a code submission and return heuristic feedback.

    This endpoint currently uses a rule-based engine that simulates
    intelligent feedback. The implementation is intentionally structured
    so it can be swapped for a real LLM later.
    """

    started = time.perf_counter()

    feedback_request = FeedbackRequest(**request.model_dump())
    feedback_result = engine.generate_feedback(feedback_request)

    duration_ms = (time.perf_counter() - started) * 1000

    logger.info(
        "analyze_code completed",
        extra={
            "route": "/ai/analyze-code",
            "language": request.language,
            "tests_passed": request.tests_passed,
            "has_execution_error": bool(request.execution_error),
            "overall_score": feedback_result.overall_score,
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

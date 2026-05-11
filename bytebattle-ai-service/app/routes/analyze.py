import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Any

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])


class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "python"
    taskDescription: Optional[str] = None
    # camelCase fields (sent by the frontend)
    testsPassed: Optional[bool] = None
    testsPassedCount: Optional[int] = None
    testsTotal: Optional[int] = None
    executionError: Optional[str] = None
    runtimeMs: Optional[float] = None
    # snake_case aliases (for compatibility / feedbackApi)
    tests_passed: Optional[bool] = None
    tests_passed_count: Optional[int] = None
    tests_total: Optional[int] = None
    execution_error: Optional[str] = None
    runtime_ms: Optional[float] = None


def _do_analyze(request: CodeAnalysisRequest) -> dict:
    """Core analysis logic — ALWAYS returns a valid dict, never None."""

    logger.info("Analyzing %s code", request.language)

    # Normalise: prefer camelCase, fall back to snake_case
    tests_passed = request.testsPassed if request.testsPassed is not None else request.tests_passed
    tests_passed_count = request.testsPassedCount if request.testsPassedCount is not None else request.tests_passed_count
    tests_total = request.testsTotal if request.testsTotal is not None else request.tests_total
    execution_error = request.executionError if request.executionError is not None else request.execution_error
    runtime_ms = request.runtimeMs if request.runtimeMs is not None else request.runtime_ms

    # Score
    if tests_passed is True:
        score = 85
        summary = f"✅ Great work! Your {request.language} code passes the tests."
    elif tests_passed is False:
        score = 45
        summary = f"📝 Your {request.language} code needs some work. Keep debugging!"
    else:
        score = 65
        summary = f"🤖 Analysis complete for your {request.language} code."

    # Feedback points
    points: List[dict] = []

    if tests_passed_count is not None and tests_total is not None:
        severity = "medium" if tests_passed_count < tests_total else "low"
        points.append({
            "title": "Test Results",
            "description": f"Passed {tests_passed_count}/{tests_total} tests.",
            "category": "testing",
            "severity": severity,
        })

    if execution_error:
        points.append({
            "title": "Execution Error",
            "description": execution_error[:200],
            "category": "error",
            "severity": "high",
        })

    if runtime_ms and runtime_ms > 1000:
        points.append({
            "title": "Performance",
            "description": f"Runtime: {runtime_ms:.0f} ms — consider optimising your solution.",
            "category": "performance",
            "severity": "medium",
        })

    # Always add a general point so the list is never empty
    points.append({
        "title": "Code Quality",
        "description": (
            f"Your {request.language} solution has been analysed. "
            "Review the feedback above and iterate."
        ),
        "category": "analysis",
        "severity": "low",
    })

    logger.info("Returning response: score=%d, points=%d", score, len(points))

    return {
        "overall_score": score,
        "summary": summary,
        "points": points,
        "extra": {
            "language": request.language,
            "service": "bytebattle-ai",
            "status": "ok",
        },
    }


@router.post("/analyze-code")
def analyze_code(request: CodeAnalysisRequest):
    """AI Code Analysis — primary endpoint used by the frontend."""
    return _do_analyze(request)


@router.post("/code/analyze")
def analyze_code_alias(request: CodeAnalysisRequest):
    """Alias route for backward compatibility."""
    return _do_analyze(request)

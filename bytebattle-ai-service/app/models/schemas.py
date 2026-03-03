from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class CodeAnalysisRequest(BaseModel):
    """
    Request body for the /ai/analyze-code endpoint.

    This mirrors the fields used by FeedbackRequest in the feedback engine
    so we can pass it through cleanly.
    """

    code: str
    language: str = "python"

    tests_passed: Optional[bool] = None
    execution_error: Optional[str] = None
    runtime_ms: Optional[float] = None
    memory_kb: Optional[int] = None
    task_description: Optional[str] = None



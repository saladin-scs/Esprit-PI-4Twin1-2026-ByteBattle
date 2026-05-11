from __future__ import annotations

from typing import Optional, Any, Union
from pydantic import BaseModel, Field

class CodeAnalysisRequest(BaseModel):
    """
    Request body for the /ai/code/analyze endpoint.
    Accepts frontend camelCase fields.
    """
    code: str
    language: str = "python"
    
    # Frontend sends these exact fields
    testsPassed: Optional[Union[bool, int]] = None
    testsPassedCount: Optional[int] = None
    testsTotal: Optional[int] = None
    executionError: Optional[str] = None
    runtimeMs: Optional[float] = None
    taskDescription: Optional[str] = None
    
    # Also support backend snake_case (for internal use)
    tests_passed: Optional[int] = Field(default=None, alias="testsPassed")
    execution_error: Optional[str] = Field(default=None, alias="executionError")
    runtime_ms: Optional[float] = Field(default=None, alias="runtimeMs")
    task_description: Optional[str] = Field(default=None, alias="taskDescription")
    
    class Config:
        populate_by_name = True
        extra = "allow"
from __future__ import annotations

from typing import Optional, Union, Any
from pydantic import BaseModel, Field

class CodeAnalysisRequest(BaseModel):
    """
    Request body for the /ai/code/analyze endpoint.
    Accepts both frontend (camelCase) and backend (snake_case) formats.
    """
    code: str
    language: str = "python"
    
    # Handle both naming conventions
    testsPassed: Optional[Union[bool, int, str]] = Field(default=None, alias="tests_passed")
    tests_passed: Optional[Union[bool, int, str]] = None
    
    executionError: Optional[str] = Field(default=None, alias="execution_error")
    execution_error: Optional[str] = None
    
    runtimeMs: Optional[float] = Field(default=None, alias="runtime_ms")
    runtime_ms: Optional[float] = None
    
    memoryKb: Optional[int] = Field(default=None, alias="memory_kb")
    memory_kb: Optional[int] = None
    
    taskDescription: Optional[str] = Field(default=None, alias="task_description")
    task_description: Optional[str] = None
    
    # Additional fields your frontend might send
    language_version: Optional[str] = None
    testsPassedCount: Optional[int] = None
    testsTotal: Optional[int] = None

    class Config:
        populate_by_name = True  # Allow both field names
        extra = "allow"  # Allow extra fields to prevent 422 errors
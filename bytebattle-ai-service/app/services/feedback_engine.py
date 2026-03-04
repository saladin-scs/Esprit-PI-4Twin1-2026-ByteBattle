from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import ast


@dataclass
class FeedbackPoint:
    """
    A single feedback item about the user's submission.
    """

    title: str
    description: str
    category: str  # e.g. "strength", "improvement", "hint"
    severity: str  # e.g. "info", "low", "medium", "high"


@dataclass
class FeedbackResult:
    """
    Final feedback payload returned by the engine.
    """

    overall_score: int  # 0–100
    summary: str
    points: List[FeedbackPoint] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FeedbackRequest:
    """
    Input payload for the feedback engine.

    This is intentionally generic so it can be produced from
    whatever execution / judging layer you build around it.
    """

    code: str
    language: str = "python"

    # Optional execution / judging context
    tests_passed: Optional[bool] = None
    execution_error: Optional[str] = None
    runtime_ms: Optional[float] = None
    memory_kb: Optional[int] = None
    task_description: Optional[str] = None


class FeedbackEngine:
    """
    MVP feedback engine that *simulates* intelligent behavior using
    simple rule‑based analysis.

    Later, you can swap implementation here to call a real LLM while
    keeping the same public interface.
    """

    def generate_feedback(self, request: FeedbackRequest) -> FeedbackResult:
        if request.language.lower() != "python":
            # For non‑Python languages we fall back to very generic feedback.
            summary = _build_generic_summary(request)
            points = _build_generic_points(request)
            score = _estimate_score_from_tests_only(request)
            return FeedbackResult(overall_score=score, summary=summary, points=points)

        structure_info = _analyze_python_code(request.code)
        score = _estimate_score(request, structure_info)
        points = _build_points(request, structure_info)
        summary = _build_summary(request, structure_info, score)

        return FeedbackResult(
            overall_score=score,
            summary=summary,
            points=points,
            extra={"structure": structure_info},
        )


def get_feedback_engine() -> FeedbackEngine:
    """
    Factory for the current feedback engine implementation.

    When you introduce a real LLM‑based engine, you can switch the
    return type here to route traffic without touching call‑sites.
    """

    return FeedbackEngine()


def _clamp_score(score: int) -> int:
    return max(0, min(100, score))


def _safe_parse_python(code: str) -> Optional[ast.AST]:
    try:
        return ast.parse(code)
    except SyntaxError:
        return None


def _count_comment_lines(code: str) -> int:
    return sum(1 for line in code.splitlines() if line.strip().startswith("#"))


def _has_docstrings(tree: ast.AST) -> bool:
    if ast.get_docstring(tree):
        return True
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if ast.get_docstring(node):
                return True
    return False


def _average_function_length(tree: ast.AST) -> Optional[float]:
    func_lengths: List[int] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start = getattr(node, "lineno", None)
            end = getattr(node, "end_lineno", None)
            if start is not None and end is not None and end >= start:
                func_lengths.append(end - start + 1)
    if not func_lengths:
        return None
    return sum(func_lengths) / len(func_lengths)


def _analyze_python_code(code: str) -> Dict[str, Any]:
    tree = _safe_parse_python(code)

    info: Dict[str, Any] = {}
    info["line_count"] = len(code.splitlines())
    info["comment_lines"] = _count_comment_lines(code)
    info["syntax_ok"] = tree is not None

    if tree is None:
        return info

    info["has_docstrings"] = _has_docstrings(tree)

    func_count = 0
    class_count = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_count += 1
        elif isinstance(node, ast.ClassDef):
            class_count += 1

    info["function_count"] = func_count
    info["class_count"] = class_count
    info["avg_function_length"] = _average_function_length(tree)

    return info


def _estimate_score(request: FeedbackRequest, structure: Dict[str, Any]) -> int:
    score = 50

    # Test results & runtime
    if request.tests_passed is True:
        score += 25
    elif request.tests_passed is False:
        score -= 10

    if request.execution_error:
        score -= 15

    # Very rough performance nudges
    if request.runtime_ms is not None:
        if request.runtime_ms < 100:
            score += 5
        elif request.runtime_ms > 2000:
            score -= 5

    # Code structure heuristics
    if not structure.get("syntax_ok", True):
        score -= 20

    line_count = structure.get("line_count") or 0
    if line_count <= 0:
        score -= 10
    elif line_count < 10:
        score -= 5  # likely incomplete / very short
    elif line_count > 200:
        score -= 5  # might be overly long for an interview‑style task

    if structure.get("has_docstrings"):
        score += 5

    if structure.get("comment_lines", 0) >= 3:
        score += 3

    return _clamp_score(score)


def _estimate_score_from_tests_only(request: FeedbackRequest) -> int:
    score = 50
    if request.tests_passed is True:
        score += 25
    elif request.tests_passed is False:
        score -= 10
    if request.execution_error:
        score -= 15
    return _clamp_score(score)


def _build_generic_summary(request: FeedbackRequest) -> str:
    parts: List[str] = []

    if request.tests_passed is True:
        parts.append("Your solution passes the available tests.")
    elif request.tests_passed is False:
        parts.append("Your solution is not yet passing the available tests.")

    if request.execution_error:
        parts.append(
            "There was a runtime error that should be fixed before submission."
        )

    if not parts:
        parts.append(
            "A basic analysis of your submission is complete. Consider running more tests locally to validate the behavior."
        )

    return " ".join(parts)


def _build_generic_points(request: FeedbackRequest) -> List[FeedbackPoint]:
    points: List[FeedbackPoint] = []

    if request.tests_passed is True:
        points.append(
            FeedbackPoint(
                title="Tests passing",
                description="Your submission passes the provided tests, which is a strong indicator that it meets the basic requirements.",
                category="strength",
                severity="info",
            )
        )
    elif request.tests_passed is False:
        points.append(
            FeedbackPoint(
                title="Fix failing tests",
                description="Some tests are failing. Start by reproducing the failures locally and iterating until all tests pass.",
                category="improvement",
                severity="high",
            )
        )

    if request.execution_error:
        points.append(
            FeedbackPoint(
                title="Resolve runtime error",
                description=f"The execution raised an error: {request.execution_error}. Investigate the stack trace and guard against invalid inputs.",
                category="improvement",
                severity="high",
            )
        )

    if not points:
        points.append(
            FeedbackPoint(
                title="Add more tests",
                description="Consider adding more tests (including edge cases) to increase your confidence in the solution.",
                category="improvement",
                severity="medium",
            )
        )

    return points


def _build_summary(
    request: FeedbackRequest, structure: Dict[str, Any], score: int
) -> str:
    parts: List[str] = []

    if request.tests_passed is True:
        parts.append("Your solution passes the current tests")
    elif request.tests_passed is False:
        parts.append("Your solution does not yet pass all tests")
    else:
        parts.append("Your solution has not been fully evaluated by tests yet")

    if not structure.get("syntax_ok", True):
        parts.append("and contains syntax errors that prevent it from running.")
        return " ".join(parts)

    line_count = structure.get("line_count")
    if line_count is not None:
        if line_count < 15:
            parts.append("and is quite concise.")
        elif line_count > 150:
            parts.append(
                "and is relatively long; consider simplifying or extracting helpers."
            )
        else:
            parts.append("with a reasonable code size for this kind of task.")

    if structure.get("has_docstrings"):
        parts.append("You have included docstrings, which improves readability.")
    else:
        parts.append("Adding docstrings to key functions would improve readability.")

    parts.append(f"Overall, this submission currently scores {score}/100.")

    return " ".join(parts)


def _build_points(
    request: FeedbackRequest, structure: Dict[str, Any]
) -> List[FeedbackPoint]:
    points: List[FeedbackPoint] = []

    # Strengths
    if request.tests_passed is True:
        points.append(
            FeedbackPoint(
                title="All tests passing",
                description="Your solution passes the available tests, which is a strong sign that it satisfies the main requirements.",
                category="strength",
                severity="info",
            )
        )

    if structure.get("syntax_ok", True):
        points.append(
            FeedbackPoint(
                title="No syntax errors",
                description="The code parses correctly, which is a good baseline for further improvements.",
                category="strength",
                severity="info",
            )
        )

    if structure.get("has_docstrings"):
        points.append(
            FeedbackPoint(
                title="Uses docstrings",
                description="Docstrings on functions/classes make it easier for others (and your future self) to understand the intent of your code.",
                category="strength",
                severity="low",
            )
        )

    # Areas for improvement
    if request.tests_passed is False:
        points.append(
            FeedbackPoint(
                title="Investigate failing tests",
                description="Use the failing test cases as a guide to identify gaps in your logic or unhandled edge cases.",
                category="improvement",
                severity="high",
            )
        )

    if request.execution_error:
        points.append(
            FeedbackPoint(
                title="Handle runtime errors",
                description=f"The execution raised an error: {request.execution_error}. Add input validation and error handling to make your solution more robust.",
                category="improvement",
                severity="high",
            )
        )

    if not structure.get("syntax_ok", True):
        points.append(
            FeedbackPoint(
                title="Fix syntax issues",
                description="The code contains syntax errors. Start by fixing those so that the program can run and be tested.",
                category="improvement",
                severity="high",
            )
        )

    line_count = structure.get("line_count") or 0
    if line_count and line_count > 200:
        points.append(
            FeedbackPoint(
                title="Simplify long solution",
                description="The solution is quite long. Consider extracting helper functions, removing duplication, and simplifying complex branches.",
                category="improvement",
                severity="medium",
            )
        )
    elif line_count and line_count < 10:
        points.append(
            FeedbackPoint(
                title="Expand core logic",
                description="The solution is very short, which may mean important edge cases or validations are missing.",
                category="improvement",
                severity="medium",
            )
        )

    comment_lines = structure.get("comment_lines", 0)
    if comment_lines < 2:
        points.append(
            FeedbackPoint(
                title="Add clarifying comments",
                description="Consider adding a few well‑placed comments explaining non‑obvious decisions or tricky parts of the logic.",
                category="improvement",
                severity="low",
            )
        )

    # Small hint‑style suggestions
    if request.runtime_ms is not None and request.runtime_ms > 2000:
        points.append(
            FeedbackPoint(
                title="Investigate performance",
                description="Runtime appears relatively high. Look for opportunities to reduce repeated work, use more efficient data structures, or prune unnecessary computations.",
                category="hint",
                severity="medium",
            )
        )

    if not points:
        points.append(
            FeedbackPoint(
                title="Keep iterating",
                description="This is a solid starting point. As a next step, focus on polishing readability and adding more tests around edge cases.",
                category="hint",
                severity="info",
            )
        )

    return points



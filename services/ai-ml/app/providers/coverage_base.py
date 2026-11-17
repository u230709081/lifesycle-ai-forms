
from typing import Protocol

from app.schemas.coverage import CoveragePlanRequest


class CoverageSelectionProvider(Protocol):
    """
    Defines the interface for coverage selection providers.

    Future implementations can use different LLM APIs
    without changing the Coverage Planner pipeline.
    """

    def select_concepts(
        self,
        request: CoveragePlanRequest,
    ) -> dict[str, object]:
        ...


from app.schemas.coverage import CoveragePlanRequest
from app.pipelines.coverage_planner import plan_coverage


class MockAlgorithmCoverageProvider:
    """
    Adapter for the existing deterministic
    Coverage Planner.

    No network requests.
    No LLM calls.
    No API keys.
    """

    def select_concepts(
        self,
        request: CoveragePlanRequest,
    ) -> dict[str, object]:
        result = plan_coverage(request)

        return {
            "selectedConceptIds": list(
                result.selectedConceptIds
            )
        }

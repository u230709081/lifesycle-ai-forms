
from app.schemas.coverage import CoveragePlanRequest


class FakeCoverageProvider:
    """
    Controlled fake provider for local development and tests.

    Returns predefined concept IDs.
    Does not call an external AI service.
    """

    def __init__(
        self,
        selected_concept_ids: list[str],
    ) -> None:
        self._selected_concept_ids = list(
            selected_concept_ids
        )

    def select_concepts(
        self,
        request: CoveragePlanRequest,
    ) -> dict[str, object]:
        return {
            "selectedConceptIds": list(
                self._selected_concept_ids
            )
        }

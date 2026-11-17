
from app.providers.coverage_base import (
    CoverageSelectionProvider,
)
from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)
from app.schemas.coverage_provider import (
    ProviderCoverageSelection,
)


def plan_coverage_with_provider(
    request: CoveragePlanRequest,
    provider: CoverageSelectionProvider,
) -> CoveragePlanResponse:
    """
    Run coverage planning through a provider.

    Validate input, provider output, and selected IDs.
    Never accept unknown or missing required concepts.
    """

    # 1. Validate request values.

    if not request.intent.strip():
        raise ValueError("intent must not be blank")

    if not request.domainPackId.strip():
        raise ValueError("domainPackId must not be blank")

    if not request.domainPackVersion.strip():
        raise ValueError("domainPackVersion must not be blank")

    available_ids = [
        concept.id
        for concept in request.availableConcepts
    ]

    if any(not concept_id.strip() for concept_id in available_ids):
        raise ValueError("Concept IDs must not be blank")

    if len(available_ids) != len(set(available_ids)):
        raise ValueError("Duplicate concept IDs are not allowed")

    # 2. Handle empty candidate list.

    if not available_ids:
        return CoveragePlanResponse(
            domainPackId=request.domainPackId,
            domainPackVersion=request.domainPackVersion,
            selectedConceptIds=[],
            warnings=[
                "No domain concepts were provided; "
                "coverage cannot be planned."
            ],
        )

    # 3. Call the injected provider.

    raw_output = provider.select_concepts(request)

    # 4. Validate provider response structure.

    output = ProviderCoverageSelection.model_validate(
        raw_output
    )

    selected_ids = output.selectedConceptIds

    if any(not concept_id.strip() for concept_id in selected_ids):
        raise ValueError(
            "Provider returned a blank concept ID"
        )

    if len(selected_ids) != len(set(selected_ids)):
        raise ValueError(
            "Provider returned duplicate concept IDs"
        )

    # 5. Reject concepts that were not supplied.

    available_set = set(available_ids)
    selected_set = set(selected_ids)

    unknown_ids = selected_set - available_set

    if unknown_ids:
        raise ValueError(
            "Provider selected unknown concept IDs: "
            + ", ".join(sorted(unknown_ids))
        )

    # 6. Ensure required concepts are included.

    required_ids = {
        concept.id
        for concept in request.availableConcepts
        if concept.importance == "required"
    }

    missing_required = required_ids - selected_set

    if missing_required:
        raise ValueError(
            "Provider omitted required concept IDs: "
            + ", ".join(sorted(missing_required))
        )

    # 7. Preserve the input concept ordering.

    ordered_ids = [
        concept_id
        for concept_id in available_ids
        if concept_id in selected_set
    ]

    # 8. Build the canonical response.

    warnings = []

    if not ordered_ids:
        warnings.append(
            "No concepts were selected by the provider."
        )

    return CoveragePlanResponse(
        domainPackId=request.domainPackId,
        domainPackVersion=request.domainPackVersion,
        selectedConceptIds=ordered_ids,
        warnings=warnings,
    )

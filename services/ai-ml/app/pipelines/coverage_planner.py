
import re

from app.schemas.contracts import DomainConcept
from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)


def _mentions_concept(
    concept: DomainConcept,
    text: str,
) -> bool:
    """
    Check whether a concept name or synonym
    appears explicitly in the supplied text.
    """

    labels = [concept.name, *concept.synonyms]

    for label in labels:
        phrase = label.strip()

        if not phrase:
            continue

        pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"

        if re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        ):
            return True

    return False


def _validate_request(
    request: CoveragePlanRequest,
) -> None:
    """
    Validate business-level input assumptions
    before running the mock planner.
    """

    if not request.intent.strip():
        raise ValueError("intent must not be blank")

    if not request.domainPackId.strip():
        raise ValueError("domainPackId must not be blank")

    if not request.domainPackVersion.strip():
        raise ValueError("domainPackVersion must not be blank")

    concept_ids = [
        concept.id
        for concept in request.availableConcepts
    ]

    if any(not concept_id.strip() for concept_id in concept_ids):
        raise ValueError("Concept IDs must not be blank")

    if len(concept_ids) != len(set(concept_ids)):
        raise ValueError("Duplicate concept IDs are not allowed")


def plan_coverage(
    request: CoveragePlanRequest,
) -> CoveragePlanResponse:
    """
    Deterministic mock Coverage Planner.

    Rules:
    - Include required concepts.
    - Include recommended concepts.
    - Include optional concepts only when
      explicitly mentioned.
    - Preserve the original concept order.
    - Never invent concept IDs.
    """

    _validate_request(request)

    context_text = " ".join([
        request.intent,
        *request.constraints,
    ])

    selected_ids: list[str] = []

    for concept in request.availableConcepts:

        if concept.importance in (
            "required",
            "recommended",
        ):
            selected_ids.append(concept.id)

        elif _mentions_concept(
            concept,
            context_text,
        ):
            selected_ids.append(concept.id)

    warnings: list[str] = []

    if not request.availableConcepts:
        warnings.append(
            "No domain concepts were provided; "
            "coverage cannot be planned."
        )

    elif not selected_ids:
        warnings.append(
            "No concepts matched the mock selection rules."
        )

    return CoveragePlanResponse(
        domainPackId=request.domainPackId,
        domainPackVersion=request.domainPackVersion,
        selectedConceptIds=selected_ids,
        warnings=warnings,
    )

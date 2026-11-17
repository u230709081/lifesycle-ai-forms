
import pytest

from pydantic import ValidationError

from app.providers.fake_coverage import (
    FakeCoverageProvider,
)
from app.pipelines.provider_coverage_planner import (
    plan_coverage_with_provider,
)
from app.schemas.contracts import DomainConcept
from app.schemas.coverage import CoveragePlanRequest


def make_concept(
    concept_id: str,
    importance: str = "optional",
) -> DomainConcept:
    return DomainConcept(
        id=concept_id,
        name=concept_id,
        description="Test concept",
        synonyms=[],
        importance=importance,
        relatedConceptIds=[],
    )


def make_request(
    concepts: list[DomainConcept],
    intent: str = "Create a form",
) -> CoveragePlanRequest:
    return CoveragePlanRequest(
        intent=intent,
        domainPackId="property-uk",
        domainPackVersion="0.1",
        availableConcepts=concepts,
        constraints=[],
    )


class StaticProvider:
    """
    Test double for injecting arbitrary provider output.
    """

    def __init__(
        self,
        result: dict[str, object],
    ) -> None:
        self.result = result

    def select_concepts(
        self,
        request: CoveragePlanRequest,
    ) -> dict[str, object]:
        return self.result


def test_valid_provider_result_preserves_order():
    request = make_request([
        make_concept("address", "required"),
        make_concept("energy_rating"),
        make_concept("details", "recommended"),
    ])

    provider = FakeCoverageProvider([
        "energy_rating",
        "address",
    ])

    result = plan_coverage_with_provider(
        request,
        provider,
    )

    assert result.selectedConceptIds == [
        "address",
        "energy_rating",
    ]
    assert result.warnings == []


def test_unknown_concept_is_rejected():
    request = make_request([
        make_concept("address", "required"),
    ])

    provider = FakeCoverageProvider([
        "address",
        "invented_concept",
    ])

    with pytest.raises(
        ValueError,
        match="unknown concept IDs",
    ):
        plan_coverage_with_provider(
            request,
            provider,
        )


def test_missing_required_concept_is_rejected():
    request = make_request([
        make_concept("address", "required"),
        make_concept("energy_rating"),
    ])

    provider = FakeCoverageProvider([
        "energy_rating",
    ])

    with pytest.raises(
        ValueError,
        match="omitted required concept IDs",
    ):
        plan_coverage_with_provider(
            request,
            provider,
        )


def test_duplicate_selection_is_rejected():
    request = make_request([
        make_concept("address", "required"),
    ])

    provider = FakeCoverageProvider([
        "address",
        "address",
    ])

    with pytest.raises(
        ValueError,
        match="duplicate concept IDs",
    ):
        plan_coverage_with_provider(
            request,
            provider,
        )


def test_empty_selection_returns_warning():
    request = make_request([
        make_concept("parking"),
    ])

    provider = FakeCoverageProvider([])

    result = plan_coverage_with_provider(
        request,
        provider,
    )

    assert result.selectedConceptIds == []
    assert len(result.warnings) == 1


@pytest.mark.parametrize(
    "invalid_result",
    [
        {"selectedConceptIds": "address"},
        {
            "selectedConceptIds": ["address"],
            "unexpectedField": True,
        },
    ],
)
def test_invalid_provider_structure_is_rejected(
    invalid_result,
):
    request = make_request([
        make_concept("address", "required"),
    ])

    provider = StaticProvider(invalid_result)

    with pytest.raises(ValidationError):
        plan_coverage_with_provider(
            request,
            provider,
        )


def test_blank_intent_is_rejected():
    request = make_request(
        [make_concept("address", "required")],
        intent="   ",
    )

    provider = FakeCoverageProvider(["address"])

    with pytest.raises(
        ValueError,
        match="intent must not be blank",
    ):
        plan_coverage_with_provider(
            request,
            provider,
        )


def test_empty_candidates_return_warning():
    request = make_request([])

    provider = FakeCoverageProvider([])

    result = plan_coverage_with_provider(
        request,
        provider,
    )

    assert result.selectedConceptIds == []
    assert len(result.warnings) == 1


def test_fake_provider_copies_input_list():
    ids = ["address"]
    provider = FakeCoverageProvider(ids)

    ids.append("unexpected")

    request = make_request([
        make_concept("address", "required"),
    ])

    output = provider.select_concepts(request)

    assert output == {
        "selectedConceptIds": ["address"]
    }


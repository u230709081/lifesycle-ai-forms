
import pytest

from app.schemas.contracts import DomainConcept
from app.schemas.coverage import CoveragePlanRequest
from app.pipelines.coverage_planner import plan_coverage


def make_concept(
    concept_id: str,
    importance: str = "optional",
    name: str | None = None,
    synonyms: list[str] | None = None,
) -> DomainConcept:
    """
    Build a test concept.
    No real domain pack is required.
    """

    return DomainConcept(
        id=concept_id,
        name=name if name is not None else concept_id,
        description="Test concept",
        synonyms=synonyms if synonyms is not None else [],
        importance=importance,
        relatedConceptIds=[],
    )


def make_request(
    concepts: list[DomainConcept],
    intent: str = "Create a general form",
    constraints: list[str] | None = None,
    domain_pack_id: str = "property-uk",
) -> CoveragePlanRequest:
    """
    Build a test CoveragePlanRequest.
    """

    return CoveragePlanRequest(
        intent=intent,
        domainPackId=domain_pack_id,
        domainPackVersion="0.1",
        availableConcepts=concepts,
        constraints=constraints if constraints is not None else [],
    )


def test_required_and_recommended_are_selected():
    concepts = [
        make_concept("parking", "optional"),
        make_concept("property_details", "recommended"),
        make_concept("property_address", "required"),
    ]

    result = plan_coverage(make_request(concepts))

    assert result.selectedConceptIds == [
        "property_details",
        "property_address",
    ]
    assert result.warnings == []


def test_optional_concept_matched_by_name():
    concepts = [
        make_concept(
            "garden_size",
            name="Garden Size",
        )
    ]

    result = plan_coverage(
        make_request(
            concepts,
            intent="Please include garden size",
        )
    )

    assert result.selectedConceptIds == ["garden_size"]


def test_optional_concept_matched_by_synonym():
    concepts = [
        make_concept(
            "energy_rating",
            name="Energy Rating",
            synonyms=["EPC"],
        )
    ]

    result = plan_coverage(
        make_request(
            concepts,
            intent="Include epc information",
        )
    )

    assert result.selectedConceptIds == ["energy_rating"]


def test_optional_concept_matched_by_constraint():
    concepts = [
        make_concept(
            "parking",
            name="Parking",
        )
    ]

    result = plan_coverage(
        make_request(
            concepts,
            constraints=["Include parking details"],
        )
    )

    assert result.selectedConceptIds == ["parking"]


def test_unmatched_optional_concept_is_excluded():
    concepts = [
        make_concept(
            "swimming_pool",
            name="Swimming Pool",
        )
    ]

    result = plan_coverage(make_request(concepts))

    assert result.selectedConceptIds == []
    assert len(result.warnings) == 1


def test_empty_concepts_return_warning():
    result = plan_coverage(make_request([]))

    assert result.selectedConceptIds == []
    assert len(result.warnings) == 1


def test_duplicate_concept_ids_rejected():
    concepts = [
        make_concept("property_address"),
        make_concept("property_address"),
    ]

    with pytest.raises(
        ValueError,
        match="Duplicate concept IDs",
    ):
        plan_coverage(make_request(concepts))


def test_blank_intent_rejected():
    concepts = [
        make_concept(
            "property_address",
            importance="required",
        )
    ]

    with pytest.raises(
        ValueError,
        match="intent must not be blank",
    ):
        plan_coverage(
            make_request(
                concepts,
                intent="   ",
            )
        )


def test_other_domain_pack_supported():
    concepts = [
        make_concept(
            "emergency_contact",
            importance="required",
            name="Emergency Contact",
        )
    ]

    result = plan_coverage(
        make_request(
            concepts,
            intent="Create an employee onboarding form",
            domain_pack_id="employee-onboarding",
        )
    )

    assert result.domainPackId == "employee-onboarding"
    assert result.selectedConceptIds == [
        "emergency_contact"
    ]

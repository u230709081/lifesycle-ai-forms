
import pytest

from pydantic import ValidationError

from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)


def sample_concept():
    return {
        "id": "property_tenure",
        "name": "Property Tenure",
        "description": "Ownership type",
        "synonyms": ["tenure", "ownership"],
        "importance": "required",
        "relatedConceptIds": []
    }


def test_valid_coverage_request():
    request = CoveragePlanRequest(
        intent="Create a property sale form",
        domainPackId="property-uk",
        domainPackVersion="0.1",
        availableConcepts=[sample_concept()]
    )

    assert request.domainPackId == "property-uk"
    assert len(request.availableConcepts) == 1
    assert request.constraints == []


def test_valid_coverage_response():
    response = CoveragePlanResponse(
        domainPackId="property-uk",
        domainPackVersion="0.1",
        selectedConceptIds=["property_tenure"],
        warnings=[]
    )

    assert response.selectedConceptIds == [
        "property_tenure"
    ]


def test_missing_intent():
    with pytest.raises(ValidationError):
        CoveragePlanRequest(
            domainPackId="property-uk",
            domainPackVersion="0.1",
            availableConcepts=[]
        )


def test_invalid_domain_concept():
    concept = sample_concept()
    concept["importance"] = "critical"

    with pytest.raises(ValidationError):
        CoveragePlanRequest(
            intent="Create a form",
            domainPackId="property-uk",
            domainPackVersion="0.1",
            availableConcepts=[concept]
        )


def test_missing_selected_concepts():
    with pytest.raises(ValidationError):
        CoveragePlanResponse(
            domainPackId="property-uk",
            domainPackVersion="0.1",
            warnings=[]
        )

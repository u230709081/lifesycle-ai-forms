
import pytest

from pydantic import ValidationError

from app.schemas.contracts import (
    DomainConcept,
    EvidenceReference,
    FieldAnswer,
)


# ==========================================
# TEST DATA
# ==========================================

def valid_answer_data():
    return {
        "fieldId": "energy_rating",
        "value": "C",
        "origin": "document",
        "support": "explicit",
        "confidenceBand": "high",
        "evidence": [
            {
                "documentId": "doc-001",
                "page": 1,
                "snippet": "Current energy rating: C"
            }
        ],
        "requiresConfirmation": True,
        "confirmedByUser": False
    }


# ==========================================
# TEST 1: VALID FIELD ANSWER
# ==========================================

def test_valid_field_answer():
    data = valid_answer_data()

    answer = FieldAnswer.model_validate(data)

    assert answer.fieldId == "energy_rating"
    assert answer.value == "C"
    assert answer.support == "explicit"
    assert answer.evidence[0].documentId == "doc-001"


# ==========================================
# TEST 2: OPTIONAL EVIDENCE
# ==========================================

def test_optional_evidence():
    data = valid_answer_data()
    data.pop("evidence")

    answer = FieldAnswer.model_validate(data)

    assert answer.evidence is None

    json_data = answer.model_dump(
        mode="json",
        exclude_none=True
    )

    assert "evidence" not in json_data


# ==========================================
# TEST 3: INVALID SUPPORT LEVEL
# ==========================================

def test_invalid_support_level():
    data = valid_answer_data()
    data["support"] = "probably"

    with pytest.raises(ValidationError):
        FieldAnswer.model_validate(data)


# ==========================================
# TEST 4: MISSING REQUIRED FIELD
# ==========================================

def test_missing_confirmation_field():
    data = valid_answer_data()
    data.pop("confirmedByUser")

    with pytest.raises(ValidationError):
        FieldAnswer.model_validate(data)


# ==========================================
# TEST 5: INVALID EVIDENCE
# ==========================================

def test_missing_document_id():
    data = valid_answer_data()
    data["evidence"] = [{"page": 1}]

    with pytest.raises(ValidationError):
        FieldAnswer.model_validate(data)


# ==========================================
# TEST 6: VALID DOMAIN CONCEPT
# ==========================================

def test_valid_domain_concept():
    concept = DomainConcept(
        id="property_tenure",
        name="Property Tenure",
        description="Ownership type",
        synonyms=["tenure", "ownership"],
        importance="required",
        relatedConceptIds=["lease_term"]
    )

    assert concept.id == "property_tenure"
    assert concept.importance == "required"


# ==========================================
# TEST 7: INVALID DOMAIN IMPORTANCE
# ==========================================

def test_invalid_domain_importance():
    with pytest.raises(ValidationError):
        DomainConcept(
            id="property_tenure",
            name="Property Tenure",
            description="Ownership type",
            synonyms=[],
            importance="critical",
            relatedConceptIds=[]
        )


# ==========================================
# TEST 8: INVALID CONFIDENCE BAND
# ==========================================

def test_invalid_confidence_band():
    data = valid_answer_data()
    data["confidenceBand"] = "very_high"

    with pytest.raises(ValidationError):
        FieldAnswer.model_validate(data)

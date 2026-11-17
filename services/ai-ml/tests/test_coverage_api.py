
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_payload() -> dict:
    """
    Create a valid mock request for API tests.
    """

    return {
        "intent": "Create a property sale form",
        "domainPackId": "property-uk",
        "domainPackVersion": "0.1",
        "availableConcepts": [
            {
                "id": "property_address",
                "name": "Property Address",
                "description": "Address of the property",
                "synonyms": ["Property Location"],
                "importance": "required",
                "relatedConceptIds": [],
            },
            {
                "id": "energy_rating",
                "name": "Energy Rating",
                "description": "Energy performance information",
                "synonyms": ["EPC"],
                "importance": "optional",
                "relatedConceptIds": [],
            },
            {
                "id": "property_details",
                "name": "Property Details",
                "description": "General property information",
                "synonyms": [],
                "importance": "recommended",
                "relatedConceptIds": [],
            },
        ],
        "constraints": [],
    }


def test_coverage_api_success():
    payload = make_payload()

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["domainPackId"] == "property-uk"
    assert data["domainPackVersion"] == "0.1"

    assert data["selectedConceptIds"] == [
        "property_address",
        "property_details",
    ]

    assert data["warnings"] == []


def test_coverage_api_optional_synonym():
    payload = make_payload()

    payload["intent"] = "Include EPC information"

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 200

    assert response.json()["selectedConceptIds"] == [
        "property_address",
        "energy_rating",
        "property_details",
    ]


def test_coverage_api_optional_constraint():
    payload = make_payload()

    payload["constraints"] = [
        "Include EPC",
    ]

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 200

    assert "energy_rating" in (
        response.json()["selectedConceptIds"]
    )


def test_coverage_api_empty_concepts():
    payload = make_payload()

    payload["availableConcepts"] = []

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["selectedConceptIds"] == []
    assert len(data["warnings"]) == 1


def test_coverage_api_blank_intent():
    payload = make_payload()

    payload["intent"] = "   "

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 422

    assert response.json()["detail"] == (
        "intent must not be blank"
    )


def test_coverage_api_duplicate_concept_ids():
    payload = make_payload()

    payload["availableConcepts"].append(
        payload["availableConcepts"][0].copy()
    )

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 422

    assert "Duplicate concept IDs" in (
        response.json()["detail"]
    )


def test_coverage_api_missing_intent():
    payload = make_payload()

    del payload["intent"]

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 422


def test_coverage_api_invalid_importance():
    payload = make_payload()

    payload["availableConcepts"][1]["importance"] = (
        "critical"
    )

    response = client.post(
        "/ml/coverage-plan",
        json=payload,
    )

    assert response.status_code == 422


def test_coverage_api_registered_in_openapi():
    response = client.get("/openapi.json")

    assert response.status_code == 200

    paths = response.json()["paths"]

    assert "/ml/coverage-plan" in paths

    assert "post" in paths["/ml/coverage-plan"]

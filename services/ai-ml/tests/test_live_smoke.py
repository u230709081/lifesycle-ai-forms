
from app.providers.fake_coverage import (
    FakeCoverageProvider,
)
from app.pipelines.coverage_planner import (
    plan_coverage,
)
from app.pipelines.provider_coverage_planner import (
    plan_coverage_with_provider,
)
from scripts.smoke_live_coverage import (
    build_test_request,
    compare_selection,
)


def test_smoke_request_contains_expected_concepts():
    request = build_test_request()

    concept_ids = {
        concept.id
        for concept in request.availableConcepts
    }

    assert concept_ids == {
        "property_address",
        "energy_rating",
        "garden_size",
    }


def test_offline_mock_shows_known_limitations():
    request = build_test_request()

    result = plan_coverage(request)

    assert result.selectedConceptIds == [
        "property_address",
        "garden_size",
    ]

    comparison = compare_selection(
        result.selectedConceptIds
    )

    assert comparison["exactMatch"] is False

    assert comparison["missing"] == [
        "energy_rating"
    ]

    assert comparison["unexpected"] == [
        "garden_size"
    ]


def test_provider_pipeline_accepts_correct_selection():
    request = build_test_request()

    provider = FakeCoverageProvider([
        "energy_rating",
        "property_address",
    ])

    result = plan_coverage_with_provider(
        request,
        provider,
    )

    comparison = compare_selection(
        result.selectedConceptIds
    )

    assert comparison["exactMatch"] is True
    assert comparison["missing"] == []
    assert comparison["unexpected"] == []

    assert result.selectedConceptIds == [
        "property_address",
        "energy_rating",
    ]

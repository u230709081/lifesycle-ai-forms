
import pytest

from app.providers.fake_coverage import (
    FakeCoverageProvider,
)
from app.providers.mock_algorithm_coverage import (
    MockAlgorithmCoverageProvider,
)
from app.pipelines.coverage_planner import (
    plan_coverage,
)
from app.schemas.coverage import CoveragePlanRequest
from eval.evaluate_coverage import (
    evaluate_cases,
    load_cases,
)
from eval.evaluate_provider import (
    evaluate_provider_cases,
)


def test_mock_algorithm_provider_delegates():
    case = load_cases()[0]

    request = CoveragePlanRequest.model_validate(
        case["request"]
    )

    provider = MockAlgorithmCoverageProvider()

    output = provider.select_concepts(request)

    baseline = plan_coverage(request)

    assert output == {
        "selectedConceptIds":
            baseline.selectedConceptIds
    }


def test_offline_provider_matches_baseline():
    cases = load_cases()

    baseline = evaluate_cases(cases)

    provider_result = evaluate_provider_cases(
        MockAlgorithmCoverageProvider(),
        cases,
    )

    assert provider_result == baseline

    assert provider_result["caseCount"] == 6
    assert provider_result["exactMatches"] == 4

    assert provider_result["microF1"] == pytest.approx(
        0.90
    )


def test_fake_provider_can_be_evaluated():
    case = load_cases()[0]

    provider = FakeCoverageProvider([
        "property_address",
        "property_details",
        "energy_rating",
    ])

    result = evaluate_provider_cases(
        provider,
        cases=[case],
    )

    assert result["caseCount"] == 1
    assert result["exactMatches"] == 1
    assert result["microF1"] == pytest.approx(1.0)


def test_unknown_provider_id_is_rejected():
    case = load_cases()[0]

    provider = FakeCoverageProvider([
        "property_address",
        "invented_id",
    ])

    with pytest.raises(
        ValueError,
        match="unknown concept IDs",
    ):
        evaluate_provider_cases(
            provider,
            cases=[case],
        )


def test_missing_required_id_is_rejected():
    case = load_cases()[0]

    provider = FakeCoverageProvider([
        "energy_rating",
    ])

    with pytest.raises(
        ValueError,
        match="omitted required concept IDs",
    ):
        evaluate_provider_cases(
            provider,
            cases=[case],
        )

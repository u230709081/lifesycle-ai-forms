
import pytest

from app.providers.mock_algorithm_coverage import (
    MockAlgorithmCoverageProvider,
)
from app.schemas.coverage import CoveragePlanRequest

from eval.analyze_challenges import CHALLENGE_PATH
from eval.evaluate_coverage import (
    load_cases,
    evaluate_cases,
)
from eval.evaluate_provider import (
    evaluate_provider_cases,
)


def test_challenge_dataset_has_twelve_cases():
    cases = load_cases(CHALLENGE_PATH)

    assert len(cases) == 12

    ids = [case["id"] for case in cases]

    assert len(ids) == len(set(ids))


def test_challenge_ground_truth_is_valid():
    cases = load_cases(CHALLENGE_PATH)

    for case in cases:
        request = CoveragePlanRequest.model_validate(
            case["request"]
        )

        available_ids = {
            concept.id
            for concept in request.availableConcepts
        }

        expected_ids = set(
            case["expectedConceptIds"]
        )

        required_ids = {
            concept.id
            for concept in request.availableConcepts
            if concept.importance == "required"
        }

        assert expected_ids.issubset(available_ids)

        assert required_ids.issubset(expected_ids)

        assert len(case["expectedConceptIds"]) == len(
            expected_ids
        )


def test_challenge_baseline_metrics():
    cases = load_cases(CHALLENGE_PATH)

    summary = evaluate_cases(cases)

    assert summary["caseCount"] == 12

    assert summary["exactMatches"] == 8

    assert summary["microPrecision"] == pytest.approx(
        15 / 17
    )

    assert summary["microRecall"] == pytest.approx(
        15 / 17
    )

    assert summary["microF1"] == pytest.approx(
        15 / 17
    )

    assert summary["requiredCoverage"] == pytest.approx(
        1.0
    )


def test_known_challenge_failures_are_detected():
    summary = evaluate_cases(
        load_cases(CHALLENGE_PATH)
    )

    results = {
        result["caseId"]: result
        for result in summary["results"]
    }

    assert results[
        "property_turkish_energy_semantic"
    ]["missing"] == ["energy_rating"]

    assert results[
        "onboarding_turkish_semantic"
    ]["missing"] == ["emergency_contact"]

    assert results[
        "property_garden_negation"
    ]["unexpected"] == ["garden_size"]

    assert results[
        "hotel_transfer_negation"
    ]["unexpected"] == ["airport_transfer"]


def test_provider_matches_challenge_baseline():
    cases = load_cases(CHALLENGE_PATH)

    baseline = evaluate_cases(cases)

    provider_result = evaluate_provider_cases(
        MockAlgorithmCoverageProvider(),
        cases,
    )

    assert provider_result == baseline

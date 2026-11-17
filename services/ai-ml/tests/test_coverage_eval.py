
import pytest

from eval.evaluate_coverage import (
    load_cases,
    evaluate_case,
    evaluate_cases,
)


def test_evaluation_dataset_loads():
    cases = load_cases()

    assert len(cases) == 6
    assert all("request" in case for case in cases)
    assert all(
        "expectedConceptIds" in case
        for case in cases
    )


def test_mock_baseline_metrics():
    summary = evaluate_cases(load_cases())

    assert summary["caseCount"] == 6
    assert summary["exactMatches"] == 4

    assert summary["microPrecision"] == pytest.approx(0.90)
    assert summary["microRecall"] == pytest.approx(0.90)
    assert summary["microF1"] == pytest.approx(0.90)

    assert summary["requiredCoverage"] == pytest.approx(1.0)

    results = {
        result["caseId"]: result
        for result in summary["results"]
    }

    assert results[
        "property_semantic_turkish"
    ]["missing"] == ["energy_rating"]

    assert results[
        "property_negation"
    ]["unexpected"] == ["garden_size"]


def test_invalid_expected_concept_is_rejected():
    case = load_cases()[0].copy()

    case["expectedConceptIds"] = [
        "concept_that_does_not_exist"
    ]

    with pytest.raises(
        ValueError,
        match="Unknown expected concept ID",
    ):
        evaluate_case(case)


def test_empty_dataset_is_rejected():
    with pytest.raises(
        ValueError,
        match="No evaluation cases",
    ):
        evaluate_cases([])

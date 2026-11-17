
import json
from pathlib import Path
from typing import Any
from collections.abc import Callable

from app.pipelines.coverage_planner import plan_coverage
from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)

PlannerCallable = Callable[
    [CoveragePlanRequest],
    CoveragePlanResponse,
]

CASES_PATH = (
    Path(__file__).resolve().parent
    / "cases"
    / "coverage_mock_v1.json"
)


def load_cases(
    path: Path = CASES_PATH,
) -> list[dict[str, Any]]:
    """
    Load evaluation cases from a JSON file.
    """

    with path.open(encoding="utf-8") as file:
        cases = json.load(file)

    if not isinstance(cases, list) or not cases:
        raise ValueError(
            "Evaluation dataset must be a non-empty list"
        )

    return cases



def evaluate_case(
    case: dict[str, Any],
    planner: PlannerCallable = plan_coverage,
) -> dict[str, Any]:

    """
    Compare the mock planner output
    against the expected concept IDs.
    """

    request = CoveragePlanRequest.model_validate(
        case["request"]
    )

    expected_ids = case["expectedConceptIds"]

    if (
        not isinstance(expected_ids, list)
        or any(not isinstance(item, str) for item in expected_ids)
        or len(expected_ids) != len(set(expected_ids))
    ):
        raise ValueError(
            "Expected concept IDs must be a unique string list"
        )

    available_ids = {
        concept.id
        for concept in request.availableConcepts
    }

    if not set(expected_ids).issubset(available_ids):
        raise ValueError(
            "Unknown expected concept ID in evaluation case"
        )

    response = planner(request)

    actual_ids = response.selectedConceptIds

    expected = set(expected_ids)
    actual = set(actual_ids)

    if len(actual_ids) != len(actual):
        raise ValueError(
            "Planner returned duplicate concept IDs"
        )

    if not actual.issubset(available_ids):
        raise ValueError(
            "Planner returned unknown concept IDs"
        )

    required_ids = {
        concept.id
        for concept in request.availableConcepts
        if concept.importance == "required"
    }

    return {
        "caseId": case["id"],
        "expected": expected_ids,
        "actual": actual_ids,
        "missing": sorted(expected - actual),
        "unexpected": sorted(actual - expected),
        "missingRequired": sorted(required_ids - actual),
        "requiredCount": len(required_ids),
        "truePositives": len(expected & actual),
        "falsePositives": len(actual - expected),
        "falseNegatives": len(expected - actual),
        "exactMatch": expected == actual,
    }



def evaluate_cases(
    cases: list[dict[str, Any]],
    planner: PlannerCallable = plan_coverage,
) -> dict[str, Any]:

    """
    Calculate aggregate evaluation metrics.
    """

    if not cases:
        raise ValueError("No evaluation cases provided")

    case_ids = [case["id"] for case in cases]

    if len(case_ids) != len(set(case_ids)):
        raise ValueError("Duplicate evaluation case IDs")

    results = [
    evaluate_case(case, planner=planner)
    for case in cases
]

    tp = sum(r["truePositives"] for r in results)
    fp = sum(r["falsePositives"] for r in results)
    fn = sum(r["falseNegatives"] for r in results)

    predicted_count = tp + fp
    expected_count = tp + fn

    precision = (
        tp / predicted_count
        if predicted_count
        else (1.0 if expected_count == 0 else 0.0)
    )

    recall = (
        tp / expected_count
        if expected_count
        else 1.0
    )

    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall
        else 0.0
    )

    exact_matches = sum(
        result["exactMatch"]
        for result in results
    )

    required_count = sum(
        result["requiredCount"]
        for result in results
    )

    missing_required = sum(
        len(result["missingRequired"])
        for result in results
    )

    required_coverage = (
        1 - missing_required / required_count
        if required_count
        else 1.0
    )

    return {
        "caseCount": len(results),
        "exactMatches": exact_matches,
        "exactMatchRate": exact_matches / len(results),
        "microPrecision": precision,
        "microRecall": recall,
        "microF1": f1,
        "requiredCoverage": required_coverage,
        "results": results,
    }


def main() -> None:
    """
    Run the evaluation from the command line.
    """

    summary = evaluate_cases(load_cases())

    print("\n=== COVERAGE PLANNER EVALUATION ===")

    for result in summary["results"]:
        status = (
            "MATCH"
            if result["exactMatch"]
            else "MISMATCH"
        )

        print(f"\n[{status}] {result['caseId']}")
        print(f"  Missing: {result['missing']}")
        print(f"  Unexpected: {result['unexpected']}")

    print("\n=== METRICS ===")

    print(
        "Exact Match:",
        f"{summary['exactMatches']}/{summary['caseCount']}"
    )

    print(
        "Precision:",
        f"{summary['microPrecision']:.2%}"
    )

    print(
        "Recall:",
        f"{summary['microRecall']:.2%}"
    )

    print(
        "F1:",
        f"{summary['microF1']:.2%}"
    )

    print(
        "Required Coverage:",
        f"{summary['requiredCoverage']:.2%}"
    )


if __name__ == "__main__":
    main()

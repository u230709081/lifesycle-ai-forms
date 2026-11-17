
from collections import defaultdict
from pathlib import Path
from typing import Any

from app.providers.mock_algorithm_coverage import (
    MockAlgorithmCoverageProvider,
)
from eval.evaluate_coverage import (
    load_cases,
    evaluate_cases,
)
from eval.evaluate_provider import (
    evaluate_provider_cases,
)


CHALLENGE_PATH = (
    Path(__file__).resolve().parent
    / "cases"
    / "coverage_challenges_v1.json"
)


def analyze_challenges() -> dict[str, Any]:
    """
    Evaluate the mock planner against the challenge dataset.

    Run the same cases through the provider pipeline.
    Both implementations must produce the same results.
    """

    cases = load_cases(CHALLENGE_PATH)

    baseline = evaluate_cases(cases)

    provider_result = evaluate_provider_cases(
        MockAlgorithmCoverageProvider(),
        cases,
    )

    if provider_result != baseline:
        raise RuntimeError(
            "Provider results differ from the baseline"
        )

    results_by_id = {
        result["caseId"]: result
        for result in baseline["results"]
    }

    category_results = defaultdict(list)

    print("\n=== COVERAGE CHALLENGE ANALYSIS ===")

    for case in cases:
        result = results_by_id[case["id"]]
        category = case["category"]

        category_results[category].append(
            result["exactMatch"]
        )

        status = (
            "MATCH"
            if result["exactMatch"]
            else "MISMATCH"
        )

        print(
            f"\n[{status}] {case['id']} "
            f"({category})"
        )

        print("  Missing:", result["missing"])
        print("  Unexpected:", result["unexpected"])

    print("\n=== OVERALL METRICS ===")

    print(
        f"Exact Match: "
        f"{baseline['exactMatches']}/"
        f"{baseline['caseCount']}"
    )

    print(
        f"Precision: "
        f"{baseline['microPrecision']:.2%}"
    )

    print(
        f"Recall: "
        f"{baseline['microRecall']:.2%}"
    )

    print(
        f"F1: "
        f"{baseline['microF1']:.2%}"
    )

    print(
        f"Required Coverage: "
        f"{baseline['requiredCoverage']:.2%}"
    )

    print("\n=== CATEGORY RESULTS ===")

    for category, matches in sorted(
        category_results.items()
    ):
        correct = sum(matches)
        total = len(matches)

        print(
            f"{category}: {correct}/{total}"
        )

    print(
        "\nOffline provider matches the baseline."
    )

    return baseline


if __name__ == "__main__":
    analyze_challenges()

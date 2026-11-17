
from typing import Any

from app.providers.coverage_base import (
    CoverageSelectionProvider,
)
from app.providers.mock_algorithm_coverage import (
    MockAlgorithmCoverageProvider,
)
from app.pipelines.provider_coverage_planner import (
    plan_coverage_with_provider,
)
from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)
from eval.evaluate_coverage import (
    load_cases,
    evaluate_cases,
)


def evaluate_provider_cases(
    provider: CoverageSelectionProvider,
    cases: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Evaluate any compatible coverage provider
    using the existing evaluation metrics.
    """

    dataset = (
        load_cases()
        if cases is None
        else cases
    )

    def provider_planner(
        request: CoveragePlanRequest,
    ) -> CoveragePlanResponse:
        return plan_coverage_with_provider(
            request,
            provider,
        )

    return evaluate_cases(
        dataset,
        planner=provider_planner,
    )


def main() -> None:
    """
    Compare the baseline pipeline with the same
    algorithm running through the provider pipeline.
    """

    cases = load_cases()

    baseline = evaluate_cases(cases)

    provider = MockAlgorithmCoverageProvider()

    provider_result = evaluate_provider_cases(
        provider,
        cases,
    )

    print("\n=== OFFLINE PROVIDER EVALUATION ===")

    print("\nBaseline Mock:")
    print(
        "Exact Match:",
        f"{baseline['exactMatches']}/{baseline['caseCount']}"
    )
    print(
        "F1:",
        f"{baseline['microF1']:.2%}"
    )

    print("\nMock via Provider Pipeline:")
    print(
        "Exact Match:",
        f"{provider_result['exactMatches']}/"
        f"{provider_result['caseCount']}"
    )
    print(
        "Precision:",
        f"{provider_result['microPrecision']:.2%}"
    )
    print(
        "Recall:",
        f"{provider_result['microRecall']:.2%}"
    )
    print(
        "F1:",
        f"{provider_result['microF1']:.2%}"
    )
    print(
        "Required Coverage:",
        f"{provider_result['requiredCoverage']:.2%}"
    )

    print("\nIndividual Cases:")

    for result in provider_result["results"]:
        status = (
            "MATCH"
            if result["exactMatch"]
            else "MISMATCH"
        )

        print(
            f"{result['caseId']}: {status}"
        )

    if provider_result == baseline:
        print(
            "\nProvider pipeline matches "
            "the original mock baseline."
        )
    else:
        print(
            "\nWARNING: Provider pipeline "
            "differs from the baseline."
        )


if __name__ == "__main__":
    main()

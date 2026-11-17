
import argparse
from getpass import getpass

from app.schemas.coverage import CoveragePlanRequest
from app.pipelines.coverage_planner import plan_coverage
from app.pipelines.provider_coverage_planner import (
    plan_coverage_with_provider,
)
from app.providers.openai_coverage import (
    OpenAICoverageProvider,
    ProviderResponseError,
)


MODEL = "gpt-5.4-mini"

EXPECTED_IDS = {
    "property_address",
    "energy_rating",
}


def build_test_request() -> CoveragePlanRequest:
    """
    Build a synthetic test request.

    No real customer information is used.
    """

    return CoveragePlanRequest(
        intent=(
            "Ev satışı için form oluştur. "
            "Enerji sertifikası bilgilerini de sor."
        ),
        domainPackId="property-uk",
        domainPackVersion="0.1",
        availableConcepts=[
            {
                "id": "property_address",
                "name": "Property Address",
                "description": "Address of the property",
                "synonyms": ["Address"],
                "importance": "required",
                "relatedConceptIds": [],
            },
            {
                "id": "energy_rating",
                "name": "Energy Rating",
                "description": "Energy performance",
                "synonyms": ["EPC"],
                "importance": "optional",
                "relatedConceptIds": [],
            },
            {
                "id": "garden_size",
                "name": "Garden Size",
                "description": "Garden area",
                "synonyms": ["bahçe büyüklüğü"],
                "importance": "optional",
                "relatedConceptIds": [],
            },
        ],
        
        constraints=[
            "Bahçe büyüklüğü bilgisini ekleme."
        ],

    )


def compare_selection(
    selected_ids: list[str],
) -> dict:
    """
    Compare selected concepts with expected concepts.
    """

    actual = set(selected_ids)

    return {
        "exactMatch": actual == EXPECTED_IDS,
        "missing": sorted(EXPECTED_IDS - actual),
        "unexpected": sorted(actual - EXPECTED_IDS),
    }


def main() -> int:
    """
    Run an offline preview by default.

    A live API request requires the --live argument
    and explicit confirmation.
    """

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--live",
        action="store_true",
        help="Send exactly one live OpenAI API request",
    )

    args = parser.parse_args()

    request = build_test_request()

    print("\n=== LIFESYCLE COVERAGE TEST ===")
    print("Model:", MODEL)

    # Offline mode: no API access.

    if not args.live:
        result = plan_coverage(request)

        print("\nMODE: OFFLINE MOCK")

        print(
            result.model_dump_json(indent=2)
        )

        print(
            "\nComparison:",
            compare_selection(
                result.selectedConceptIds
            ),
        )

        print("\nNo API request was sent.")

        return 0

    # Live mode: require confirmation.

    print("\nMODE: LIVE OPENAI API")
    print("This operation may incur API charges.")

    confirmation = input(
        "Send one live request? Type EVET: "
    ).strip()

    if confirmation != "EVET":
        print("Cancelled. No request sent.")
        return 0

    try:
        from openai import OpenAI, OpenAIError
    except ImportError:
        print(
            "OpenAI SDK is missing. "
            "Install requirements-openai.txt."
        )
        return 1

    api_key = getpass(
        "OpenAI API key (hidden input): "
    ).strip()

    if not api_key:
        print("API key cannot be empty.")
        return 1

    client = OpenAI(
        api_key=api_key,
        timeout=30.0,
        max_retries=0,
    )

    del api_key

    provider = OpenAICoverageProvider(
        model=MODEL,
        client=client,
    )

    try:
        result = plan_coverage_with_provider(
            request,
            provider,
        )

    except (
        OpenAIError,
        ProviderResponseError,
        ValueError,
    ) as exc:
        print(
            "Live test failed:",
            type(exc).__name__,
        )
        return 1

    print("\n=== MODEL RESULT ===")

    print(
        result.model_dump_json(indent=2)
    )

    print("\n=== COMPARISON ===")

    print(
        compare_selection(
            result.selectedConceptIds
        )
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

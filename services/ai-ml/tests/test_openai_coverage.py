
import json
from types import SimpleNamespace

import pytest

from app.providers.openai_coverage import (
    OpenAICoverageProvider,
    ProviderResponseError,
)
from app.schemas.coverage import CoveragePlanRequest
from app.schemas.coverage_provider import (
    ProviderCoverageSelection,
)
from app.pipelines.provider_coverage_planner import (
    plan_coverage_with_provider,
)


class FakeResponses:
    def __init__(self, parsed):
        self.parsed = parsed
        self.last_kwargs = None

    def parse(self, **kwargs):
        self.last_kwargs = kwargs
        return SimpleNamespace(
            output_parsed=self.parsed
        )


class FakeClient:
    def __init__(self, parsed):
        self.responses = FakeResponses(parsed)


def make_request():
    return CoveragePlanRequest(
        intent=(
            "Ev satış formunda enerji "
            "sertifikası bilgisi olsun"
        ),
        domainPackId="property-uk",
        domainPackVersion="0.1",
        availableConcepts=[
            {
                "id": "address",
                "name": "Property Address",
                "description": "Address",
                "synonyms": [],
                "importance": "required",
                "relatedConceptIds": [],
            },
            {
                "id": "energy_rating",
                "name": "Energy Rating",
                "description": "Energy class",
                "synonyms": ["EPC"],
                "importance": "optional",
                "relatedConceptIds": [],
            },
        ],
        constraints=[
            "Bahçe büyüklüğünü ekleme"
        ],
    )


def test_adapter_builds_structured_request():
    client = FakeClient(
        ProviderCoverageSelection(
            selectedConceptIds=[
                "energy_rating",
                "address",
            ]
        )
    )

    provider = OpenAICoverageProvider(
        model="test-model",
        client=client,
    )

    output = provider.select_concepts(
        make_request()
    )

    assert output == {
        "selectedConceptIds": [
            "energy_rating",
            "address",
        ]
    }

    args = client.responses.last_kwargs

    assert args["model"] == "test-model"

    assert (
        args["text_format"]
        is ProviderCoverageSelection
    )

    assert args["store"] is False

    payload = json.loads(args["input"])

    assert "enerji sertifikası" in payload["intent"]

    assert (
        payload["availableConcepts"][1]["id"]
        == "energy_rating"
    )

    assert payload["constraints"] == [
        "Bahçe büyüklüğünü ekleme"
    ]


def test_adapter_works_with_existing_pipeline():
    client = FakeClient(
        ProviderCoverageSelection(
            selectedConceptIds=[
                "energy_rating",
                "address",
            ]
        )
    )

    provider = OpenAICoverageProvider(
        model="test-model",
        client=client,
    )

    result = plan_coverage_with_provider(
        make_request(),
        provider,
    )

    assert result.selectedConceptIds == [
        "address",
        "energy_rating",
    ]


def test_missing_parsed_output_is_rejected():
    provider = OpenAICoverageProvider(
        model="test-model",
        client=FakeClient(None),
    )

    with pytest.raises(
        ProviderResponseError,
        match="no valid structured selection",
    ):
        provider.select_concepts(make_request())


def test_unexpected_parsed_type_is_rejected():
    provider = OpenAICoverageProvider(
        model="test-model",
        client=FakeClient({
            "selectedConceptIds": ["address"]
        }),
    )

    with pytest.raises(ProviderResponseError):
        provider.select_concepts(make_request())


def test_blank_model_name_is_rejected():
    with pytest.raises(
        ValueError,
        match="model must not be blank",
    ):
        OpenAICoverageProvider(
            model="   ",
            client=FakeClient(None),
        )


def test_unknown_concept_is_rejected():
    client = FakeClient(
        ProviderCoverageSelection(
            selectedConceptIds=[
                "address",
                "invented_id",
            ]
        )
    )

    provider = OpenAICoverageProvider(
        model="test-model",
        client=client,
    )

    with pytest.raises(
        ValueError,
        match="unknown concept IDs",
    ):
        plan_coverage_with_provider(
            make_request(),
            provider,
        )


class RaisingResponses:
    def parse(self, **kwargs):
        raise RuntimeError(
            "Test connection failure"
        )


def test_provider_error_is_not_hidden():
    client = SimpleNamespace(
        responses=RaisingResponses()
    )

    provider = OpenAICoverageProvider(
        model="test-model",
        client=client,
    )

    with pytest.raises(
        RuntimeError,
        match="Test connection failure",
    ):
        provider.select_concepts(make_request())

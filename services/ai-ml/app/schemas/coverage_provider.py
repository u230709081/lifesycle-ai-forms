
from pydantic import BaseModel, ConfigDict


class ProviderCoverageSelection(BaseModel):
    """
    Internal schema for provider-generated selections.

    This is not a shared TypeScript/JSON contract.
    """

    model_config = ConfigDict(
        extra="forbid",
        strict=True,
    )

    selectedConceptIds: list[str]

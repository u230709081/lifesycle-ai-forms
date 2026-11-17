
from pydantic import BaseModel, Field

from app.schemas.contracts import DomainConcept


class CoveragePlanRequest(BaseModel):
    """
    Input schema for the Coverage Planner.

    Receives user intent and retrieved domain concepts.
    """

    intent: str
    domainPackId: str
    domainPackVersion: str
    availableConcepts: list[DomainConcept]
    constraints: list[str] = Field(default_factory=list)


class CoveragePlanResponse(BaseModel):
    """
    Output schema for the Coverage Planner.

    Returns concept IDs, not generated questions.
    """

    domainPackId: str
    domainPackVersion: str
    selectedConceptIds: list[str]
    warnings: list[str]

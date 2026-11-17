
from typing import Any, Literal

from pydantic import BaseModel


# ==========================================
# 1. CANONICAL VALUE TYPES
# ==========================================

RequirementLevel = Literal[
    "required",
    "required_if",
    "recommended",
    "optional"
]

AnswerOrigin = Literal[
    "user",
    "summary",
    "lifesycle",
    "document",
    "external",
    "ai_inference"
]

SupportLevel = Literal[
    "explicit",
    "inferred",
    "unsupported"
]

ConfidenceBand = Literal[
    "verified",
    "high",
    "medium",
    "low"
]


# ==========================================
# 2. EVIDENCE POSITION
# ==========================================

class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


# ==========================================
# 3. EVIDENCE REFERENCE
# ==========================================

class EvidenceReference(BaseModel):
    documentId: str
    page: int | None = None
    snippet: str | None = None
    boundingBox: BoundingBox | None = None


# ==========================================
# 4. DOMAIN CONCEPT
# ==========================================

class DomainConcept(BaseModel):
    id: str
    name: str
    description: str
    synonyms: list[str]
    importance: Literal[
        "required",
        "recommended",
        "optional"
    ]
    relatedConceptIds: list[str]


# ==========================================
# 5. FIELD ANSWER
# ==========================================

class FieldAnswer(BaseModel):
    fieldId: str
    value: Any
    origin: AnswerOrigin
    support: SupportLevel
    confidenceBand: ConfidenceBand
    evidence: list[EvidenceReference] | None = None
    requiresConfirmation: bool
    confirmedByUser: bool


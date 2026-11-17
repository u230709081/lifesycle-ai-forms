
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel
from app.api.routes.coverage import router as coverage_router

# Initialize the AI/ML service
app = FastAPI(
    title="Lifesycle AI/ML Service",
    version="0.1.0",
    description="AI-powered form intelligence service"
)
app.include_router(coverage_router)

# Define a structured response
class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["ai-ml"]


# Health check endpoint
@app.get("/ml/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-ml"
    )

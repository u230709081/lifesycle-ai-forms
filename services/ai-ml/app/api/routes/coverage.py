
from fastapi import APIRouter, HTTPException

from app.pipelines.coverage_planner import plan_coverage
from app.schemas.coverage import (
    CoveragePlanRequest,
    CoveragePlanResponse,
)


router = APIRouter(
    prefix="/ml",
    tags=["AI/ML Coverage"],
)


@router.post(
    "/coverage-plan",
    response_model=CoveragePlanResponse,
)
def create_coverage_plan(
    request: CoveragePlanRequest,
) -> CoveragePlanResponse:
    """
    Accept a CoveragePlanRequest over HTTP
    and return the mock Coverage Planner result.

    The route does not implement planning logic.
    It delegates that responsibility to the pipeline.
    """

    try:
        result = plan_coverage(request)

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return result

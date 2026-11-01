from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    milestone: str


app = FastAPI(
    title="SupportOps Intelligence",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Liveness only; does not claim model or database readiness."""
    return HealthResponse(status="ok", service="intelligence", milestone="M1")

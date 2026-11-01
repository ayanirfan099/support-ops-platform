from __future__ import annotations

import hmac
import os
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from supportops_intelligence.engine import (
    MAX_CHUNK_CHARS,
    MAX_CHUNKS_PER_SEARCH,
    RANKER_VERSION,
    SearchCandidate,
    chunk_text,
    classify_ticket,
    search_lexically,
)

MAX_REQUEST_BYTES = 1_048_576
MAX_DOCUMENT_CHARS = 32_000
MAX_DOCUMENT_LINES = 5_000
Queue = Literal["billing", "account", "technical", "sales"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthResponse(StrictModel):
    status: str
    service: str
    milestone: str


class ChunkRequest(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=MAX_DOCUMENT_CHARS)

    @field_validator("title")
    @classmethod
    def title_must_contain_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title must contain non-whitespace text")
        return normalized

    @field_validator("content")
    @classmethod
    def content_must_contain_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content must contain non-whitespace text")
        if len(value.splitlines()) > MAX_DOCUMENT_LINES:
            raise ValueError("document has too many lines")
        return value


class ChunkOutput(StrictModel):
    ordinal: int = Field(ge=0)
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    content: str = Field(min_length=1, max_length=MAX_CHUNK_CHARS)


class ChunkResponse(StrictModel):
    chunks: list[ChunkOutput] = Field(min_length=1, max_length=MAX_DOCUMENT_LINES)
    chunker_version: str


class SearchCandidateInput(StrictModel):
    chunk_id: str = Field(min_length=1, max_length=100)
    document_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    content: str = Field(min_length=1, max_length=MAX_CHUNK_CHARS)


class SearchRequest(StrictModel):
    query: str = Field(min_length=1, max_length=400)
    candidates: list[SearchCandidateInput] = Field(max_length=MAX_CHUNKS_PER_SEARCH)
    limit: int = Field(default=5, ge=1, le=5)

    @field_validator("query")
    @classmethod
    def query_must_contain_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("query must contain non-whitespace text")
        return normalized

    @model_validator(mode="after")
    def candidate_ids_are_unique(self) -> SearchRequest:
        ids = [candidate.chunk_id for candidate in self.candidates]
        if len(ids) != len(set(ids)):
            raise ValueError("candidate chunk IDs must be unique")
        return self


class SearchHitOutput(StrictModel):
    chunk_id: str
    score: float = Field(ge=0)


class SearchResponse(StrictModel):
    hits: list[SearchHitOutput]
    insufficient_evidence: bool
    ranker_version: str


class ClassificationRequest(StrictModel):
    subject: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=10_000)

    @field_validator("subject", "description")
    @classmethod
    def text_must_contain_non_whitespace(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must contain non-whitespace characters")
        return value


class ClassificationResponse(StrictModel):
    suggested_queue: Queue | None
    scores: dict[Queue, float]
    model_version: str
    abstained: bool
    abstention_reason: str | None
    known_token_coverage: float = Field(ge=0, le=1)
    score_warning: str


class RequestBodyLimitMiddleware:
    """Buffer at most the configured byte limit, including chunked requests."""

    def __init__(self, app, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = next(
            (
                value.decode("latin-1")
                for key, value in scope.get("headers", [])
                if key.lower() == b"content-length"
            ),
            None,
        )
        if content_length is not None:
            try:
                too_large = int(content_length) > self.max_bytes
            except ValueError:
                too_large = True
            if too_large:
                response = JSONResponse(
                    status_code=413,
                    content={"detail": "request body is too large"},
                )
                await response(scope, receive, send)
                return

        body = bytearray()
        more_body = True
        while more_body:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                response = JSONResponse(
                    status_code=413,
                    content={"detail": "request body is too large"},
                )
                await response(scope, receive, send)
                return
            more_body = message.get("more_body", False)

        replayed = False

        async def replay_body():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay_body, send)


fastapi_app = FastAPI(
    title="SupportOps Intelligence",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
)
fastapi_app.add_middleware(RequestBodyLimitMiddleware, max_bytes=MAX_REQUEST_BYTES)


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("INTELLIGENCE_SERVICE_TOKEN", "")
    if len(expected) < 32:
        raise HTTPException(status_code=503, detail="service is not configured")
    provided = authorization.removeprefix("Bearer ") if authorization else ""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="unauthorized")
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="unauthorized")


@fastapi_app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Liveness only; does not claim model or database readiness."""
    return HealthResponse(status="ok", service="intelligence", milestone="M3")


@fastapi_app.post(
    "/v1/chunks",
    response_model=ChunkResponse,
    dependencies=[Depends(require_service_token)],
)
def create_chunks(payload: ChunkRequest) -> ChunkResponse:
    chunks = chunk_text(payload.content)
    if not chunks:
        raise HTTPException(status_code=422, detail="document contains no indexable text")
    return ChunkResponse(
        chunks=[
            ChunkOutput(
                ordinal=chunk.ordinal,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                content=chunk.content,
            )
            for chunk in chunks
        ],
        chunker_version="line-chunker-v1",
    )


@fastapi_app.post(
    "/v1/search",
    response_model=SearchResponse,
    dependencies=[Depends(require_service_token)],
)
def search(payload: SearchRequest) -> SearchResponse:
    candidates = [
        SearchCandidate(
            chunk_id=item.chunk_id,
            document_id=item.document_id,
            title=item.title,
            start_line=item.start_line,
            end_line=item.end_line,
            content=item.content,
        )
        for item in payload.candidates
    ]
    hits = search_lexically(payload.query, candidates, limit=payload.limit)
    return SearchResponse(
        hits=[SearchHitOutput(chunk_id=hit.chunk_id, score=hit.score) for hit in hits],
        insufficient_evidence=not hits,
        ranker_version=RANKER_VERSION,
    )


@fastapi_app.post(
    "/v1/classify",
    response_model=ClassificationResponse,
    dependencies=[Depends(require_service_token)],
)
def classify(payload: ClassificationRequest) -> ClassificationResponse:
    result = classify_ticket(payload.subject, payload.description)
    return ClassificationResponse(
        suggested_queue=result.suggested_queue,
        scores=result.scores,
        model_version=result.model_version,
        abstained=result.abstained,
        abstention_reason=result.abstention_reason,
        known_token_coverage=result.known_token_coverage,
        score_warning="Uncalibrated synthetic-fixture ranking scores; not probabilities.",
    )


app = fastapi_app

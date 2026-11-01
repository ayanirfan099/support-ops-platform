from __future__ import annotations

from fastapi.testclient import TestClient

from supportops_intelligence.main import MAX_REQUEST_BYTES, app

TOKEN = "test-only-intelligence-token-that-is-long-enough"
client = TestClient(app)


def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {TOKEN}"}


def test_private_routes_require_configured_bearer_token(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    response = client.post(
        "/v1/classify",
        json={"subject": "Password reset", "description": "Cannot log in to my account."},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "unauthorized"}


def test_private_routes_fail_closed_when_service_token_is_missing(monkeypatch) -> None:
    monkeypatch.delenv("INTELLIGENCE_SERVICE_TOKEN", raising=False)
    response = client.post(
        "/v1/classify",
        headers=auth_headers(),
        json={"subject": "Password reset", "description": "Cannot log in to my account."},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "service is not configured"}


def test_chunking_preserves_exact_source_line_coordinates(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    response = client.post(
        "/v1/chunks",
        headers=auth_headers(),
        json={
            "title": "  Account recovery  ",
            "content": "\nUse the recovery link on line two.\nContact the account team.",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "chunks": [
            {
                "ordinal": 0,
                "start_line": 2,
                "end_line": 3,
                "content": "Use the recovery link on line two.\nContact the account team.",
            }
        ],
        "chunker_version": "line-chunker-v1",
    }


def test_chunking_splits_long_lines_without_changing_line_citation(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    text = "a" * 1_850
    response = client.post(
        "/v1/chunks",
        headers=auth_headers(),
        json={"title": "Long fixture", "content": text},
    )

    assert response.status_code == 200
    chunks = response.json()["chunks"]
    assert [chunk["content"] for chunk in chunks] == ["a" * 900, "a" * 900, "a" * 50]
    assert all(chunk["start_line"] == chunk["end_line"] == 1 for chunk in chunks)


def test_chunking_rejects_unbounded_documents_and_blank_input(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    too_long = client.post(
        "/v1/chunks",
        headers=auth_headers(),
        json={"title": "Large fixture", "content": "x" * 32_001},
    )
    blank = client.post(
        "/v1/chunks",
        headers=auth_headers(),
        json={"title": "Blank fixture", "content": " \n \n"},
    )

    assert too_long.status_code == 422
    assert blank.status_code == 422


def test_declared_oversized_request_is_rejected_before_body_read() -> None:
    response = client.post(
        "/v1/chunks",
        headers={"Content-Length": str(MAX_REQUEST_BYTES + 1)},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "request body is too large"}


def test_streaming_request_body_is_bounded_without_content_length() -> None:
    response = client.post(
        "/v1/chunks",
        content=iter([b" " * (MAX_REQUEST_BYTES // 2), b" " * (MAX_REQUEST_BYTES // 2 + 1)]),
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "request body is too large"}


def test_lexical_search_returns_ranked_chunk_ids_and_insufficient_evidence(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    candidates = [
        {
            "chunk_id": "chunk-account",
            "document_id": "doc-account",
            "title": "Account recovery guide",
            "start_line": 4,
            "end_line": 5,
            "content": "Reset a forgotten password with the account recovery link.",
        },
        {
            "chunk_id": "chunk-billing",
            "document_id": "doc-billing",
            "title": "Billing guide",
            "start_line": 2,
            "end_line": 2,
            "content": "Download a payment receipt from billing settings.",
        },
    ]
    found = client.post(
        "/v1/search",
        headers=auth_headers(),
        json={"query": "forgotten password account", "candidates": candidates},
    )
    missing = client.post(
        "/v1/search",
        headers=auth_headers(),
        json={"query": "volcano telescope", "candidates": candidates},
    )

    assert found.status_code == 200
    assert found.json()["hits"][0]["chunk_id"] == "chunk-account"
    assert found.json()["hits"][0]["score"] > 0
    assert found.json()["insufficient_evidence"] is False
    assert found.json()["ranker_version"] == "bm25-k1.2-b0.75-v1"
    assert missing.status_code == 200
    assert missing.json()["hits"] == []
    assert missing.json()["insufficient_evidence"] is True


def test_search_rejects_duplicate_chunk_ids(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    candidate = {
        "chunk_id": "same",
        "document_id": "doc-1",
        "title": "Article",
        "start_line": 1,
        "end_line": 1,
        "content": "password recovery account access",
    }
    response = client.post(
        "/v1/search",
        headers=auth_headers(),
        json={"query": "password", "candidates": [candidate, candidate]},
    )

    assert response.status_code == 422


def test_classifier_suggests_known_account_issue_and_exposes_score_caveat(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    response = client.post(
        "/v1/classify",
        headers=auth_headers(),
        json={
            "subject": "Password reset for account login",
            "description": (
                "My account is locked and I cannot sign in after resetting the password."
            ),
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["suggested_queue"] == "account"
    assert body["abstained"] is False
    assert body["model_version"] == "synthetic-mnb-v1"
    assert body["score_warning"].startswith("Uncalibrated")
    assert set(body["scores"]) == {"billing", "account", "technical", "sales"}
    assert abs(sum(body["scores"].values()) - 1.0) < 0.00001


def test_classifier_abstains_on_unknown_or_ambiguous_text(monkeypatch) -> None:
    monkeypatch.setenv("INTELLIGENCE_SERVICE_TOKEN", TOKEN)
    unknown = client.post(
        "/v1/classify",
        headers=auth_headers(),
        json={"subject": "QZX-883", "description": "flurbo snarglet wibble."},
    )
    generic = client.post(
        "/v1/classify",
        headers=auth_headers(),
        json={"subject": "Need help", "description": "Please help with this request."},
    )

    assert unknown.status_code == generic.status_code == 200
    assert unknown.json()["abstained"] is True
    assert unknown.json()["suggested_queue"] is None
    assert unknown.json()["abstention_reason"] == "insufficient_known_terms"
    assert generic.json()["abstained"] is True
    assert generic.json()["suggested_queue"] is None

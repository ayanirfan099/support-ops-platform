"""Bounded, local-only lexical evidence and synthetic Naive Bayes triage.

Scores are ranking/model outputs for review, not calibrated probabilities.
"""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Literal

Queue = Literal["billing", "account", "technical", "sales"]
QUEUES: tuple[Queue, ...] = ("billing", "account", "technical", "sales")
CLASSIFIER_VERSION = "synthetic-mnb-v1"
RANKER_VERSION = "bm25-k1.2-b0.75-v1"
MAX_CHUNK_CHARS = 900
MAX_CHUNKS_PER_SEARCH = 500
MAX_SEARCH_RESULTS = 5
MIN_EVIDENCE_SCORE = 0.15
CLASSIFIER_MIN_SCORE = 0.52
CLASSIFIER_MIN_MARGIN = 0.12
CLASSIFIER_MIN_KNOWN_COVERAGE = 0.20

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOP_WORDS = frozenset(
    "a an and are as at be by for from how i in is it me my of on or our please the this to "
    "we what when where with you your can could help need unable want was were would".split()
)


@dataclass(frozen=True)
class TextChunk:
    ordinal: int
    start_line: int
    end_line: int
    content: str


@dataclass(frozen=True)
class SearchCandidate:
    chunk_id: str
    document_id: str
    title: str
    start_line: int
    end_line: int
    content: str


@dataclass(frozen=True)
class SearchHit:
    chunk_id: str
    score: float


@dataclass(frozen=True)
class TriageResult:
    suggested_queue: Queue | None
    scores: dict[str, float]
    model_version: str
    abstained: bool
    abstention_reason: str | None
    known_token_coverage: float


def _tokens(text: str) -> list[str]:
    return [token for token in _TOKEN_RE.findall(text.lower()) if token not in _STOP_WORDS]


def chunk_text(text: str) -> list[TextChunk]:
    """Split normalized text into exact, line-addressable excerpts without overlap."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")
    chunks: list[TextChunk] = []
    buffer: list[str] = []
    buffer_chars = 0
    buffer_start = 0
    buffer_end = 0

    def flush() -> None:
        nonlocal buffer, buffer_chars, buffer_start, buffer_end
        if buffer:
            chunks.append(
                TextChunk(
                    ordinal=len(chunks),
                    start_line=buffer_start,
                    end_line=buffer_end,
                    content="\n".join(buffer),
                )
            )
            buffer = []
            buffer_chars = 0
            buffer_start = 0
            buffer_end = 0

    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        if len(line) > MAX_CHUNK_CHARS:
            flush()
            for offset in range(0, len(line), MAX_CHUNK_CHARS):
                chunks.append(
                    TextChunk(
                        ordinal=len(chunks),
                        start_line=line_number,
                        end_line=line_number,
                        content=line[offset : offset + MAX_CHUNK_CHARS],
                    )
                )
            continue

        added_chars = len(line) + (1 if buffer else 0)
        if buffer and buffer_chars + added_chars > MAX_CHUNK_CHARS:
            flush()
        if not buffer:
            buffer_start = line_number
        buffer.append(line)
        buffer_end = line_number
        buffer_chars += len(line) + (1 if len(buffer) > 1 else 0)

    flush()
    return chunks


def search_lexically(
    query: str,
    candidates: list[SearchCandidate],
    *,
    limit: int = MAX_SEARCH_RESULTS,
) -> list[SearchHit]:
    """Return BM25 ranking signals, not probabilities or proof of support."""
    query_terms = _tokens(query)
    if not query_terms or not candidates:
        return []

    tokenized = [_tokens(candidate.content) for candidate in candidates]
    doc_freq: Counter[str] = Counter()
    term_freqs: list[Counter[str]] = []
    for tokens in tokenized:
        frequencies = Counter(tokens)
        term_freqs.append(frequencies)
        doc_freq.update(frequencies.keys())

    average_length = sum(map(len, tokenized)) / len(tokenized) or 1.0
    total_documents = len(candidates)
    ranked: list[SearchHit] = []
    for candidate, tokens, frequencies in zip(candidates, tokenized, term_freqs, strict=True):
        document_length = len(tokens) or 1
        score = 0.0
        for term in query_terms:
            frequency = frequencies.get(term, 0)
            if not frequency:
                continue
            inverse_frequency = math.log(
                1.0 + (total_documents - doc_freq[term] + 0.5) / (doc_freq[term] + 0.5)
            )
            denominator = frequency + 1.2 * (1.0 - 0.75 + 0.75 * document_length / average_length)
            score += inverse_frequency * (frequency * 2.2) / denominator
        if score >= MIN_EVIDENCE_SCORE:
            ranked.append(SearchHit(chunk_id=candidate.chunk_id, score=score))

    ranked.sort(key=lambda hit: (-hit.score, hit.chunk_id))
    return [
        SearchHit(chunk_id=hit.chunk_id, score=round(hit.score, 6))
        for hit in ranked[: min(max(limit, 1), MAX_SEARCH_RESULTS)]
    ]


_TRAINING_EXAMPLES: tuple[tuple[Queue, str], ...] = (
    ("billing", "invoice billing charge card payment receipt refund duplicate transaction"),
    ("billing", "subscription renewal tax balance payment refund bank card"),
    ("billing", "charged twice need refund for order invoice amount"),
    ("billing", "billing statement payment failed receipt credit invoice"),
    ("billing", "cancel plan and refund the latest subscription charge"),
    ("account", "account password reset login sign in locked profile verification"),
    ("account", "cannot access account forgot password email sign in"),
    ("account", "change username update profile login two factor code"),
    ("account", "reset credentials account is locked after password update"),
    ("account", "verification code and email address for my profile"),
    ("technical", "technical error bug crash outage application fails integration"),
    ("technical", "server error timeout api broken loading issue"),
    ("technical", "software defect integration log exception deployment"),
    ("technical", "page crashes after update cannot load dashboard"),
    ("technical", "connection failure api request error unexpected response"),
    ("sales", "sales pricing quote demo product plan purchase proposal"),
    ("sales", "request a product demonstration enterprise pricing quote"),
    ("sales", "which plan supports more seats contact sales"),
    ("sales", "interested in buying service need a quote for team"),
    ("sales", "upgrade plan features contract procurement estimate"),
)


class _NaiveBayes:
    def __init__(self) -> None:
        class_documents: Counter[str] = Counter()
        class_terms: dict[str, Counter[str]] = defaultdict(Counter)
        vocabulary: set[str] = set()
        for queue, text in _TRAINING_EXAMPLES:
            tokens = _tokens(text)
            class_documents[queue] += 1
            class_terms[queue].update(tokens)
            vocabulary.update(tokens)
        self._documents = class_documents
        self._terms = class_terms
        self._vocabulary = vocabulary
        self._total_documents = len(_TRAINING_EXAMPLES)
        self._alpha = 1.0

    def scores(self, text: str) -> tuple[dict[str, float], float]:
        tokens = _tokens(text)
        known_tokens = [token for token in tokens if token in self._vocabulary]
        coverage = len(known_tokens) / len(tokens) if tokens else 0.0
        if not known_tokens:
            return {queue: 0.0 for queue in QUEUES}, coverage

        log_scores: dict[str, float] = {}
        vocabulary_size = len(self._vocabulary)
        for queue in QUEUES:
            class_total = sum(self._terms[queue].values())
            denominator = class_total + self._alpha * vocabulary_size
            score = math.log(self._documents[queue] / self._total_documents)
            for token in known_tokens:
                score += math.log((self._terms[queue][token] + self._alpha) / denominator)
            log_scores[queue] = score

        maximum = max(log_scores.values())
        exponents = {queue: math.exp(value - maximum) for queue, value in log_scores.items()}
        normalizer = sum(exponents.values())
        return (
            {queue: exponents[queue] / normalizer for queue in QUEUES},
            coverage,
        )


_CLASSIFIER = _NaiveBayes()


def classify_ticket(subject: str, description: str) -> TriageResult:
    scores, coverage = _CLASSIFIER.scores(f"{subject}\n{description}")
    ranked = sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))
    top_queue, top_score = ranked[0]
    margin = top_score - ranked[1][1]

    if coverage < CLASSIFIER_MIN_KNOWN_COVERAGE:
        reason = "insufficient_known_terms"
    elif top_score < CLASSIFIER_MIN_SCORE:
        reason = "low_model_score"
    elif margin < CLASSIFIER_MIN_MARGIN:
        reason = "ambiguous_input"
    else:
        reason = None

    return TriageResult(
        suggested_queue=top_queue if reason is None else None,  # type: ignore[arg-type]
        scores={queue: round(score, 6) for queue, score in scores.items()},
        model_version=CLASSIFIER_VERSION,
        abstained=reason is not None,
        abstention_reason=reason,
        known_token_coverage=round(coverage, 4),
    )

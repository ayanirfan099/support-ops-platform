FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app

RUN python -m pip install --no-cache-dir --disable-pip-version-check uv==0.10.11
COPY services/intelligence/pyproject.toml services/intelligence/uv.lock ./
COPY services/intelligence/src ./src
RUN uv sync --locked --no-dev --no-editable

RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid app --home-dir /app app && \
    chown -R app:app /app
USER app

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8001
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["python", "-c", "from urllib.request import urlopen; urlopen('http://127.0.0.1:8001/health', timeout=2)"]
CMD ["uvicorn", "supportops_intelligence.main:app", "--host", "0.0.0.0", "--port", "8001"]

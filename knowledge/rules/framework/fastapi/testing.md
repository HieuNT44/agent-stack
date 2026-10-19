---
description: FastAPI test conventions
paths: ["tests/**/*.py", "**/test_*.py"]
---
# FastAPI testing

- `pytest` + `pytest-asyncio` (auto mode), `httpx.AsyncClient(transport=ASGITransport(app=app))`.
- Bypass auth with `app.dependency_overrides[get_current_user] = fake_principal` (the project's auth dependency); clear overrides in fixture teardown.
- Unit tests: mock repository interfaces (`AsyncMock`) — test services without DB/HTTP.
- Integration tests: real DB (test container/transaction rollback per test); never the shared dev/prod DB.
- Per endpoint cover: happy path, validation error (422), unauthenticated (401), forbidden/other-user's resource (403/404), not found, and a repo-failure path.
- Assert status code **and** response shape; assert side effects (row created, call made with args).
- Fix bug = failing test first (reproduce), then fix.
- Tests deterministic: freeze time, seed randomness, stub external services (LLM, S3, TTS, Redis).
- Run the project's test command (from `AGENTS.md`, `pyproject.toml` or the Makefile); paste real output when claiming pass.

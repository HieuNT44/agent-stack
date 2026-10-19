---
description: Lint, format, typing and dependency conventions for FastAPI repos
paths: ["pyproject.toml", "**/Makefile", "**/.pre-commit-config.yaml", "**/requirements*.txt", "**/ruff.toml", "**/.env.sample"]
---
# Tooling

Take the lint, typecheck and test commands from the project's `AGENTS.md`; where it lists none, read `pyproject.toml`/Makefile/CI. Don't invent them.

- Format: black (or `ruff format`) + isort (or ruff `I`). Lint: ruff or flake8. Run before commit; don't hand-format against the tool.
- Types: annotate public functions; mypy/pyright if configured. No blanket `# type: ignore` — narrow with code + reason.
- Dependencies: one manager (Poetry/uv/pip-tools), lockfile committed; add deps deliberately, pin via lock; separate dev group.
- Python version declared once (pyproject / Docker image) and matched in CI.
- Pre-commit hooks mirror CI checks.
- Settings: `pydantic-settings`, `.env.sample` with placeholders, real `.env` git-ignored.
- Pytest config in `pyproject.toml` (`asyncio_mode="auto"` for async).
- Version-sensitive: FastAPI 0.118+ runs the exit code of a `yield` dependency after the response is sent, so a commit failure there cannot change the status. Older releases ran it before. `HTTPBearer` answers a missing token with 403 on older releases and 401 on newer ones, so assert what the project's own auth dependency returns.
- Assumed versions: FastAPI ≥0.100, Pydantic v2, SQLAlchemy 2.0, Python ≥3.10. On older stacks (Pydantic v1: `.dict()`, `orm_mode`; SQLAlchemy 1.x) follow the repo's existing style and flag the gap instead of mixing.

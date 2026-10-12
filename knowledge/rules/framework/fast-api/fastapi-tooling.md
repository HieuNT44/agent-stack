---
description: Lint, format, typing and dependency conventions for FastAPI repos
paths: ["**/*.py", "pyproject.toml"]
---
# Tooling

Commands come from Project bindings (`LINT_CMD`, `TYPECHECK_CMD`, `TEST_CMD`). Don't invent; read `pyproject.toml`/Makefile/CI.

- Format: black (or `ruff format`) + isort (or ruff `I`). Lint: ruff or flake8. Run before commit; don't hand-format against the tool.
- Types: annotate public functions; mypy/pyright if configured. No blanket `# type: ignore` — narrow with code + reason.
- Dependencies: one manager (Poetry/uv/pip-tools), lockfile committed; add deps deliberately, pin via lock; separate dev group.
- Python version declared once (pyproject / Docker image) and matched in CI.
- Pre-commit hooks mirror CI checks.
- Settings: `pydantic-settings`, `.env.sample` with placeholders, real `.env` git-ignored.
- Pytest config in `pyproject.toml` (`asyncio_mode="auto"` for async).
- Version-sensitive behaviours (yield-dep timing, HTTPBearer 401/403): see `README-fastapi.md`.
- Assumed versions: FastAPI ≥0.100, Pydantic v2, SQLAlchemy 2.0, Python ≥3.10. On older stacks (Pydantic v1: `.dict()`, `orm_mode`; SQLAlchemy 1.x) follow the repo's existing style and flag the gap instead of mixing.

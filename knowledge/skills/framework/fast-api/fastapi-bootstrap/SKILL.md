---
name: fastapi-bootstrap
description: First step when adopting the portable FastAPI rules/skills in a repo: scans the codebase and fills the Project bindings table in CLAUDE.md (paths, auth/session deps, sync vs async, test/lint commands, migration tool). Use right after copying the fastapi-* rules/skills into a new repo, when bindings are missing or stale, or when the user says set up / onboard / adapt FastAPI skills to this project.
---

# FastAPI bootstrap

Goal: produce an accurate **Project bindings** table in `CLAUDE.md` (template: `.claude/README-fastapi.md`). Read-only scan, then one edit.

## Steps
1. **Detect stack** — read `pyproject.toml`/`requirements*.txt`: FastAPI, Pydantic (v1/v2), SQLAlchemy (version, driver: aiomysql/asyncpg/pymysql…), Alembic, Redis, queue, test libs, ruff/black/mypy. Python version (pyproject, Dockerfile).
2. **Sync or async** — grep `async def` routes + `AsyncSession` vs `Session`/`def`. If mixed, record that and flag it.
3. **Layout** — list `src/**` / `app/**` top dirs; map to router/controller, service, repository, schema/DTO, entity, infra. Decide `ARCH_STYLE` clean vs flat.
4. **Entry points** — find `main.py` (app, lifespan, exception handlers, router registry file).
5. **Auth** — grep `HTTPBearer|OAuth2|Depends(.*(jwt|auth|current_user))`; record dependency name + module + principal DTO.
6. **Session dep** — grep `get_session|get_db|SessionLocal`; note who commits.
7. **Response/errors/logger** — grep `create_success_response|JSONResponse|HTTPException|class .*Exception|logger|loguru`.
8. **Commands** — read Makefile, `pyproject` scripts (poe), docker-compose, CI files, README → `RUN_CMD`, `TEST_CMD`, `LINT_CMD`, `TYPECHECK_CMD`, migration command.
9. **Migrations** — where alembic lives; which repo owns which tables.
10. **Existing conventions** — read repo `CLAUDE.md`/README; keep any existing rules, never overwrite them.

## Output
- Append/replace a `## Project bindings` section in `CLAUDE.md` with the table, values filled with real paths/names.
- Anything not inferable → `TODO: ask` + list questions to the user (max 5, specific).
- Report: detected stack, 3-5 notable deviations from the generic rules (e.g. repo commits in repo layer), and which rules look not applicable.

## Don'ts
- Don't invent names; every value must come from a file you read.
- Don't run app/DB/migrations. Don't edit source code.

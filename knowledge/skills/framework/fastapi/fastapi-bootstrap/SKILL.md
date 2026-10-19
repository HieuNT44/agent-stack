---
name: fastapi-bootstrap
description: "Scans a FastAPI repo and records its project facts (layout, auth and session dependencies, sync or async, run/test/lint commands, migration tool) in a section of AGENTS.md that the other fastapi-* rules and skills read. Use right after generating the FastAPI rules into a project, when those facts are missing or stale, or when the user says set up, onboard or adapt FastAPI to this project."
---

# FastAPI bootstrap

Goal: leave a `## FastAPI project facts` section in the project's `AGENTS.md` whose every value came from a file you read. Read-only scan, then one edit.

## Steps
1. **Detect stack** — read `pyproject.toml` / `requirements*.txt`: FastAPI, Pydantic (v1 or v2), SQLAlchemy (version, driver), Alembic, Redis, queue, test libs, ruff/black/mypy; Python version from pyproject or the Dockerfile. Done when each is named or marked absent.
2. **Sync or async** — grep `async def` routes, `AsyncSession` vs `Session`. If mixed, record that and flag it.
3. **Layout** — list the top directories under `src/` or `app/`; map them to router/controller, service, repository, schema/DTO, entity, infrastructure. Decide clean (full layers) or flat.
4. **Entry points** — find `main.py`: app, lifespan, exception handlers, the file that registers routers.
5. **Auth** — grep `HTTPBearer|OAuth2|Depends(.*(jwt|auth|current_user))`; record the dependency name, its module and the principal type.
6. **Session dependency** — grep `get_session|get_db|SessionLocal`; note who commits.
7. **Responses, errors, logger** — grep `JSONResponse|HTTPException|class .*Exception|logger|loguru`; record the response helper, error base class and logger.
8. **Commands** — read the Makefile, `pyproject` scripts, docker-compose, CI files and README; record the run, test, lint, typecheck and migration commands.
9. **Migrations** — find where Alembic lives and which repo owns which tables.
10. **Existing text** — read `AGENTS.md` first. Keep everything already in it.

## Output
- Append, or replace in place, a `## FastAPI project facts` section in `AGENTS.md` as a table: fact, value, file it came from. Create `AGENTS.md` only if the project has none.
- Anything not inferable: value `TODO: ask`, then list at most 5 specific questions to the user.
- Report the detected stack, 3-5 notable deviations from the generic rules (for example the repo layer commits), and which rules look not applicable.

## Don'ts
- Don't invent names; every value must come from a file you read.
- Don't run the app, the database or migrations. Don't edit source code.

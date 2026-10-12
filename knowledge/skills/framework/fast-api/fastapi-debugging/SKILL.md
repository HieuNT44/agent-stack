---
name: fastapi-debugging
description: Triage guide for FastAPI/SQLAlchemy failures: 500s, 401/403/422, MissingGreenlet, un-awaited coroutines, dirty sessions, blocked event loop, pool exhaustion, CORS. Reproduce-with-test first. Project-agnostic. Use whenever a FastAPI route errors, hangs, returns the wrong status/shape, or a test fails mysteriously, even if the user just pastes a traceback.
---

# FastAPI debugging

## Loop
1. **Reproduce** — exact request (method, path, body, auth). Write a failing test if feasible (`fastapi-testing`).
2. **Read the log** (where logs go + how to read them: `RUN_CMD`/container name in bindings; Docker repos: `docker logs <container>`; note which exceptions the project's error decorator/handler logs and which fall to the global handler) — app/container logs around the request id; get the *first* traceback, not the last.
3. **Localize layer** — request parse (422) → auth dep (401/403) → service → repo/DB → response serialization → handler.
4. **Hypothesis → one change → re-run.** Don't stack speculative fixes.
5. Fix root cause, keep the regression test.

## Symptom table
| Symptom | Likely cause | Check |
|---|---|---|
| 422 | schema mismatch, wrong content-type, query vs body | response `detail[].loc`; Pydantic model |
| 401 | missing/expired/wrong-alg token, wrong header scheme | decode locally (no secret in logs); clock skew |
| 403 vs 404 | ownership filter / role dep | repo query scope, role dependency |
| 500 + `MissingGreenlet` | lazy load in async: touching a relationship/expired attribute outside an awaited call (often DTO `model_validate(entity)` or a loop in the service) | first check what's already set (`relationship(lazy=...)`?); add `selectinload/joinedload` in the repo query; or load via `awaitable_attrs`; `expire_on_commit=False` only helps attribute access *after commit*, not unloaded relations; attributes expire after `rollback()` (e.g. read-only session) so build DTOs before that; `lazy="raise"` on relationships surfaces it early in tests |
| "coroutine was never awaited" | missing `await` | grep call site |
| `InvalidRequestError`/"transaction rolled back" | prior error left session dirty; swallowed `SQLAlchemyError` | find first exception; don't catch-and-continue |
| Data not saved | no commit (flush only, no session owner commit), exception after flush rolled back | session dependency commit path |
| Request hangs/slow under load | blocking call in `async def`; pool exhausted; txn held across slow call | `py-spy`/logs; pool settings; move to `def`/threadpool |
| `QueuePool limit reached` | sessions not closed, long txns, pool too small | session dep closes; pool_size/max_overflow |
| 500 `ResponseValidationError` | returned data doesn't match `response_model` | compare model vs returned shape/envelope |
| 307/308 redirect | trailing-slash mismatch | match route path; `redirect_slashes` |
| 422 only with single body param | needs `Body(embed=True)` | route signature |
| `DetachedInstanceError` | attribute access after session closed | build DTO inside session scope |
| "Event loop is closed" / "attached to a different loop" in tests | engine/loop scope mismatch | pytest-asyncio `loop_scope`; engine per loop |
| Exceptions swallowed / contextvars lost | `BaseHTTPMiddleware` | use pure ASGI middleware |
| Works locally, not in container | env vars, host names (`localhost` vs service name), ports | container env, compose network |
| CORS error in browser | origin not allowed / preflight blocked / error response lacks CORS headers | middleware order, allowed origins |
| Response shape wrong | `response_model` filtering, `from_attributes`, `exclude_unset` | schema config |
| Test passes alone, fails in suite | shared state, un-cleared `dependency_overrides`, DB leakage | fixtures teardown |

## Tips
- `uvicorn --log-level debug` only locally. Don't log secrets while debugging, and remove temp prints.
- Print SQL: `echo=True` on engine temporarily; `EXPLAIN` for slow queries.
- Check `/docs` to confirm route registered and schema is what you think.

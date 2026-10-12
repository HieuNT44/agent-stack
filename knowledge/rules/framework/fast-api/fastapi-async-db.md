---
description: SQLAlchemy 2.0 session, repository and transaction rules (async and sync)
paths: ["**/*.py"]
---
# DB access (SQLAlchemy 2.0 — async & sync)

Check `SYNC_OR_ASYNC` in Project bindings. **Pick one style per service; never mix.**

## Both styles
- One session per request via a dependency; never construct sessions in controllers/services; never share across requests/tasks.
- Commit-after-response caveat for yield dependencies on newer FastAPI: see `README-fastapi.md`; commit explicitly for writes that must not fail silently.
- **Transaction ownership in one place** (session dependency: commit on success, rollback on error). Repositories `flush()`, not `commit()` — unless bindings say otherwise.
- Read the project's real session setup before assuming (who commits/rolls back, session factory, base repository behavior); bindings win over this rule.
- Only repositories call `execute/add/merge/delete`.
- 2.0 style: `select()`, `.scalars()`, `.scalar_one_or_none()`. No legacy `session.query`.
- No N+1: no query in a loop; batch with `IN (...)`/joins. Eager-load relations (`selectinload` collections, `joinedload` scalar).
- Paginate lists with stable `order_by`; select only needed columns on big reads; index filter/sort columns.
- Bulk writes via bulk `insert()/update()`, not per-row loops.
- Catch `SQLAlchemyError` in repo → log context (no secrets/params) → re-raise typed error.
- Bind params only. Never f-string user input into SQL/`text()`.
- Schema changes via migrations only; one owner repo per table. No `create_all` in prod.
- Don't hold a transaction across slow external calls (HTTP/LLM/S3): call first, write after.

## Async
- `AsyncSession` + `async_sessionmaker(expire_on_commit=False)`; `await` every DB call.
- Lazy load raises `MissingGreenlet`: always eager-load what response needs.
- Never use sync driver/Session inside `async def`.

## Sync
- `Session` + `sessionmaker`; route is plain `def` (FastAPI runs it in threadpool).
- Don't declare `async def` route and call sync DB inside — blocks event loop.
- Size pool vs threadpool (default 40 threads): `pool_size + max_overflow` must cover concurrency; set `pool_pre_ping=True`, `pool_recycle` for MySQL.

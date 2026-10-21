---
description: FastAPI route, schema, error and response conventions
paths: ["**/routers/**/*.py", "**/routes/**/*.py", "**/api/**/*.py", "**/controllers/**/*.py", "**/presentation/**/*.py", "**/schemas/**/*.py"]
---
# FastAPI API conventions

## Routes
- Version prefix `/v1/items`; plural nouns, kebab-case; HTTP verb carries the action.
- Set `response_model` (or return a typed schema), `status_code`, `tags`, `summary`. If the project returns through an envelope helper (a response helper), follow that and keep the declared model accurate or omit it — never declare a model the route doesn't return.
- Use correct codes: 201 create, 204 no body, 422 request-schema validation (FastAPI default), 400 business-rule validation (unless project remaps 422→400), 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict.
- List endpoints: paginate (`limit` bounded, `offset`/cursor), stable `order_by`, never unbounded. Page-based envelope: `items`, `total`, `page`, plus the repo's page-size name (`per_page`/`limit`) — reuse the repo's pagination helper. Cursor-based: `items`, `next_cursor` (no `total`/`page`).
- Accept/echo `X-Request-ID` header for tracing.
- `async def` only if body awaits async I/O; plain `def` for sync DB/SDK code (runs in threadpool). Never call blocking I/O (sync DB, `requests`, `time.sleep`, heavy CPU) inside `async def` — use async libs or `run_in_threadpool`.

## Schemas (Pydantic v2)
- `model_config = ConfigDict(from_attributes=True)` for ORM → schema.
- Constrain input: `Field(min_length=…, ge=…, pattern=…)`, `Literal`/`Enum`, `extra="forbid"` on request models.
- Services return what the repo convention says (DTOs, dicts, tuples) — be consistent within a feature; never raw ORM entities to clients.
- Separate `Create`/`Update`/`Response` models; `Update` fields optional (PATCH), `model_dump(exclude_unset=True)`; reject explicit `null` for NOT NULL columns (validator).
- Use `Annotated[T, Query(...)]` / `Annotated[T, Depends(...)]` style.
- Never reuse a response schema containing secrets/internal ids as a request schema.

## Errors
- Policy (one place): repository catches `SQLAlchemyError`, logs once with context, re-raises (or wraps in a typed error `from e`); the global handler maps typed errors to responses and logs only unexpected ones. `IntegrityError` on unique/FK → 409 Conflict. Follow the repo if it differs.
- Raise typed domain/HTTP exceptions; one global handler maps them to a uniform error envelope.
- Services raise domain errors; translation to status codes happens in handlers/controller layer.
- Never return stack traces, SQL, hostnames, or raw exception text to clients. Log server-side with context.
- Don't swallow exceptions (`except Exception: pass`). Catch narrow, log, re-raise or convert.

## Responses
- One consistent success envelope (use project helper) and one error envelope.
- Dates ISO-8601 UTC; ids stable types; no `null`-vs-missing ambiguity between endpoints.

## Backwards compatibility
- Additive changes only within a version. Removing/renaming a field or changing semantics = new version or deprecation window.

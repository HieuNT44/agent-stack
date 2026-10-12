---
name: fastapi-new-feature
description: Scaffold a new FastAPI feature/endpoint end-to-end (schema, DTO, repository interface+impl, service, controller, router registration, tests), async or sync, following the repo's layering. Project-agnostic. Use whenever the user asks to add a route, endpoint, API, resource or feature to a FastAPI codebase, even if they don't mention layers.
---

# FastAPI: new feature

Principles in `.claude/rules/fastapi-*.md`. Apply them; don't restate.

## 0. Discover (never skip)
1. Read repo `CLAUDE.md` → **Project bindings** (paths, auth dep, session dep, response helper, exceptions, test cmd).
2. Find the **closest existing feature** (grep a similar route). Copy its structure, naming, imports.
3. If a DB change is needed, confirm **which repo owns the table/migrations** (`MIGRATION_TOOL` in bindings). If another repo owns it, don't add a migration here: ask the user whether the table already exists there. Otherwise migration first, as a separate step (`fastapi-migrations`).
4. Check `BARREL_EXPORTS` / `INTERFACE_LAYOUT` / `CONTROLLER_STYLE` / `PAGINATION_RESPONSE` in bindings: follow them instead of the generic shapes below (e.g. class-based controllers, `__init__.py` re-exports, paginated-response helper).

If scope is ambiguous (new table? auth level? pagination?) ask once, then proceed.

## 1. Design (write in 5-10 lines before coding)
- Endpoint(s): `METHOD /v1/<resource>` → request schema → response schema → status codes
- Auth: which dependency; ownership scope field
- Data: entities touched, queries, indexes, transaction boundary
- Errors: which typed exceptions, when

## 2. Implement in this order (each step compiles/imports)
1. **Schemas** (request/response, Pydantic v2) — constrained, `extra="forbid"` on input.
2. **DTOs** if the project separates them.
3. **Repository interface** (ABC/Protocol) — methods named by intent (`get_by_id_for_owner`, `list_paginated`).
4. **Repository impl** — 2.0 async queries, owner-scoped, eager loading, `flush()`, catch `SQLAlchemyError` → log → re-raise.
5. **Service** — logic only; takes repo(s) in `__init__`; raises typed errors; no HTTP objects.
6. **Controller/route** — thin; auth dep; error decorator/handler; `response_model`, status code, tags.
7. **Dependency factory** — session → repo → service.
8. **Register router** in the single registry, and add any required barrel exports. (Forgotten registration = 404; missing export = ImportError.)
9. **Tests** — see `fastapi-testing` skill.

## 3. Verify
- Run `TEST_CMD` + linters/formatters (project's: black/isort/ruff…).
- Hit the endpoint (curl/httpx) for happy + 401 + 422 + other-user's id.
- Walk `fastapi-review` checklist on own diff.

## Anti-patterns
- Business logic in controller; ORM in service; `commit()` in repo (unless bindings say so)
- Returning ORM entity directly; unbounded list; lazy-load in async
- Public route without a comment; ownership taken from request body
- Inventing helpers that already exist — grep first

## Sync repos
Same steps; routes/services/repos are `def`, session is `Session`, tests use `TestClient`. Match `SYNC_OR_ASYNC` in bindings.

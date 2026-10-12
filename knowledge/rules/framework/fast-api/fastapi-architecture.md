---
description: FastAPI layering and dependency direction
paths: ["**/*.py"]
---
# FastAPI architecture

Read the repo's **Project bindings** (`CLAUDE.md`) for real paths/names. Mirror the closest existing feature.

## Layers (outer → inner)
- **Router/controller**: HTTP in/out only. Parse request, call service, shape response. No business logic, no ORM.
- **Service**: business logic and orchestration. Framework-free: no `Request`, `Depends`, `Response`. Raise domain/typed errors; handlers map them to HTTP. (If the project's typed errors subclass `HTTPException`, that's tolerated.)
- **Repository**: only layer touching the DB session/ORM. Returns entities or DTOs.
- **Schemas** (request/response, Pydantic) ≠ **DTOs** (inter-layer) ≠ **entities** (ORM). Don't leak ORM entities in responses.

## Dependency direction
Outer layers depend on inner ones; the domain depends on nothing; infrastructure implements interfaces owned by inner layers. Inner layers never import outer ones (concrete layer names: bindings).
Services depend on repository **interfaces** (ABC/Protocol), impls injected at the composition root (route dependency factory).

## Rules
- Composition via `Depends` factories; keep factories thin (build repo → build service).
- One feature = one folder/module per layer; new feature never edits another feature's internals.
- No module-level mutable state, no globals for per-request data (horizontal scaling assumed).
- Config via a single settings object (pydantic-settings); no `os.environ` scattered in code.
- Startup/shutdown via `lifespan`, not deprecated `on_event`.
- Register every router explicitly in one place; forgetting = dead route.

## Clean vs flat
Match the repo. Small/CRUD repo: flat `router → service → repository` is fine; don't force domain/interface layers. Large/long-lived: full layering with repository interfaces. Never half-adopt: don't add interfaces to one feature in a flat repo.

---
description: External clients, background jobs, caching and idempotency in FastAPI
paths: ["**/*.py"]
---
# External calls, jobs, cache

## External clients (HTTP APIs, slow third-party services, storage)
- Live in infrastructure/clients behind an interface; services depend on the interface (mockable).
- One shared `httpx.AsyncClient` (lifespan-created → `app.state.http`, closed on shutdown); sync code: `httpx.Client`/SDK. Set explicit `httpx.Timeout(10, connect=3)` (default is 5s per phase).
- Always set connect+read **timeouts**. Retry with backoff+jitter only for idempotent calls and transient errors (timeout/429/5xx). Cap retries (use `tenacity`; httpx transport `retries=` covers connect errors only).
- Map provider errors to typed internal errors; never pass provider messages/keys to clients.
- Python ≥3.11: `asyncio.TaskGroup` cancels siblings on first error (unlike `gather`) — pick deliberately.
- Bound concurrency (`asyncio.Semaphore`) for fan-out; `gather(..., return_exceptions=True)` and handle each result.
- Provider/model/endpoint chosen by settings, not hardcoded.

## Background work
- `BackgroundTasks`: only short, loss-tolerant work (runs in-process, dies with worker).
- Heavy / must-retry / scheduled: real queue (Taskiq, Celery, ARQ…). Tasks idempotent, args small (ids not objects), own DB session.
- Never reuse the request's session in a background task.

## Cache (Redis)
- Key = `<app>:<env>:<resource>:<scope-id>:<version>`; always TTL; include user/tenant id in key for per-user data.
- Cache-aside; invalidate on write; tolerate cache outage (fall back to DB, don't 500).
- Don't cache auth decisions longer than token validity.

## Idempotency
- Write endpoints safe to retry: idempotency key header or natural-key upsert; unique constraint backs it.

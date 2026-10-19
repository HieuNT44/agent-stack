---
name: fastapi-performance
description: "Measure-first performance tuning for FastAPI/SQLAlchemy (async and sync): N+1, indexes, pagination, caching, blocking calls, concurrency, pool/worker sizing, external-call latency. Use whenever an endpoint or query is slow, times out, list endpoints return too much, or the user asks to optimize or speed up an API."
---

# FastAPI performance

**Measure before changing.** No optimization without a number.

## 1. Measure
- Time the endpoint (access log duration, `curl -w`, load tool: `hey`/`wrk`/`locust`).
- Break down: DB vs external call vs serialization vs CPU. Log per-stage timings.
- DB: enable SQL echo temporarily, count queries per request, `EXPLAIN` the slow ones.

## 2. DB (usual #1 cause)
- N+1 → eager load / one `IN` query. Query count should not grow with row count.
- Missing index on filter/join/sort columns; composite index order = equality first, range/sort last.
- Return less: select columns, paginate (bounded limit), keyset pagination for deep pages, avoid `COUNT(*)` on huge tables when not needed.
- Bulk insert/update statements instead of per-row loops.
- Short transactions; don't hold across external calls.

## 3. Concurrency
- Independent awaits → `asyncio.gather` with a `Semaphore` bound; handle partial failures.
- Blocking/CPU work in `async def` → `run_in_threadpool`/process pool/queue, or make route `def`.
- Sync apps: threadpool size vs DB pool size consistent.

## 4. External calls
- Shared client w/ connection reuse, timeouts, avoid sequential calls that can be parallel; cache stable results; queue long jobs (LLM/TTS) and poll/stream instead of holding the request.

## 5. Caching
- Redis cache-aside for hot read-mostly data, TTL + invalidate on write; key includes scope id. HTTP caching headers for public/static responses.

## 6. Payload
- `response_model` excludes unused fields; `orjson`/`ORJSONResponse` for big payloads; gzip at proxy.

## 7. Runtime
- Workers ≈ cores; pool sizes ≥ concurrency per worker; keep-alive; check CPU vs I/O bound before adding workers.

## Report
Before/after numbers (latency p50/p95, query count), what changed, risk. Add a test or guard where regressions are likely (query-count assertion, max page size).

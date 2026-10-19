---
description: FastAPI runtime, container and deployment rules
paths: ["**/Dockerfile*", "docker/**", "**/docker-compose*", "**/main.py"]
---
# Deploy / runtime

- Stateless app servers: no local files/sessions/in-memory state that must survive; assume N replicas.
- Process model: uvicorn `--workers`, or gunicorn + `uvicorn_worker.UvicornWorker` (separate `uvicorn-worker` package; in-tree `uvicorn.workers` is deprecated); workers ≈ cores, tune with load test. Sync apps: also watch threadpool/DB pool.
- No `--reload`/debug in prod. Non-root user in image; slim base; pinned Python.
- Config from env only; fail fast at startup on missing required settings.
- Docker `HEALTHCHECK` / orchestrator probes use the health endpoints (see observability).
- Graceful shutdown: handle SIGTERM, finish in-flight, close clients/pools in `lifespan`.
- Behind proxy: trust forwarded headers only from the proxy (uvicorn: `--proxy-headers --forwarded-allow-ips`; gunicorn: `--forwarded-allow-ips`/`FORWARDED_ALLOW_IPS`); terminate TLS at proxy; set body-size and timeout limits there too.
- Migrations run as separate deploy step, not on every app start with many replicas.

---
description: FastAPI logging, request tracing and health endpoints
paths: ["**/main.py", "**/middleware/**/*.py", "**/logging*.py", "**/logger*.py", "**/health*.py"]
---
# Observability

- Logs to **stdout** only (no local log files); structured/JSON in prod; level from settings.
- Request-ID middleware: read `X-Request-ID` or generate, bind to log context, return in response header.
- Log at boundaries: request start/end (method, path, status, duration), external calls (target, duration, outcome), caught errors (context + ids).
- Never log secrets, tokens, `Authorization`, full bodies, PII. Log ids, not emails.
- Avoid duplicate logging of one failure at every layer: prefer log where handled, or log once at the boundary. If the project's convention is repo-log + re-raise + handler-log, follow it.
- `GET /health` = liveness (no deps, always cheap). `GET /ready` = readiness (checks DB/Redis/queue with short timeout). Exclude both from auth and access-log noise.
- Optional: Prometheus/OpenTelemetry metrics (latency, error rate, pool usage); keep label cardinality low (route template, not raw path).

---
name: fastapi-security
description: "Security guardrails for FastAPI APIs: auth dependency coverage, IDOR and ownership scope, mass assignment, error disclosure, log sanitization, injection, upload validation, secrets and SSRF. Use whenever implementing or reviewing routes, auth, repositories, logging or file upload in a FastAPI repo."
---

# FastAPI security (generic)

Rules: `.claude/rules/fastapi-security.md`. Auth dependency, exception types and logger: take them from the project's `AGENTS.md` or code; names below are examples.

## 1. Auth: deny by default
- Token from `Authorization: Bearer` (`HTTPBearer`), not query/cookie unless designed so.
- Verify only in one auth-dependency module; no `jwt.decode` in controllers/services.
- Every route has `Depends(get_current_user)`. Public route → code comment with reason.
- Validate `exp`, `iss`/`aud` if used, algorithm pinned (never accept `none`); short access-token TTL. Require claims, e.g. PyJWT: `jwt.decode(tok, key, algorithms=["HS256"], options={"require": ["exp", "sub"]})`. Prefer maintained libs (PyJWT/authlib) over `python-jose`.

```python
# BAD: no auth
@router.get("/v1/items/{id}")
async def get_item(id: int, session=Depends(get_session)): ...

# GOOD
@router.get("/v1/items/{id}")
async def get_item(id: int, principal=Depends(get_current_user), service=Depends(get_service)): ...
```
Role-gated routes: dedicated dependency (`require_role("admin")`), not inline `if`.

## 2. IDOR / ownership (critical)
```python
# BAD
item = await repo.get_by_id(id)
# GOOD
item = await repo.get_by_id_for_owner(id, principal.user_id)
if item is None:
    raise NotFoundException(...)       # 404 (not 403) avoids confirming existence
```
Applies to read, update, delete, and child resources (verify parent ownership). Owner id comes from the token, never body/query.

Global content (shared lessons, notifications) has no owner: that's fine, but add a code comment `# global data, no owner scope` so reviewers can tell it from a missing filter.

## 3. Mass assignment
```python
# BAD
entity = Item(**request_dict)
# GOOD: explicit schema (extra="forbid"), set fields by name; server sets owner_id, role, status
```

## 4. Error disclosure
```python
# BAD
except Exception as e:
    return JSONResponse({"error": str(e)}, status_code=500)
# GOOD
except SQLAlchemyError as e:
    logger.error(f"items.create failed: {e}")
    raise InternalServerErrorException(...) from e
```
No stack traces, SQL, hostnames, or raw exception text to clients. Unknown exceptions → global handler → generic 500.

## 5. Log sanitization
Log ids (`user_id`), never tokens, passwords, API keys, `Authorization` header, full bodies, PII (email/phone). Redact before logging third-party payloads.

## 6. Injection
ORM or bound params only; whitelist dynamic sort/filter. No `eval/exec/pickle.loads/yaml.load` on user data; `subprocess` with list args, never `shell=True` on input.

## 7. Input & uploads
- Pydantic constraints on all bodies/queries; `extra="forbid"`.
- Uploads: max size (stream/limit), content-type + magic-byte check, extension allowlist, server-generated filename, store outside web root/object storage with private ACL + signed URLs.
- Path params used in file paths: no joins with user input (path traversal).

## 8. Outbound calls
Timeouts on every call; retries only if idempotent; allowlist/validate user-supplied URLs (block private/metadata IP ranges → SSRF); don't forward user tokens to third parties.

## 9. Secrets & config
All from settings/env/secret manager; `.env` git-ignored, `.env.sample` placeholders only; no secrets in images/logs; different keys per environment. Debug/reload off in prod; OpenAPI docs gated if private.

## 10. Abuse controls
Rate limit auth + costly endpoints (LLM, TTS, upload, search); lockout/backoff on login; CORS explicit origins (no `*` + credentials); security headers at proxy.

## Checklist
- [ ] auth dep on all new routes (router-level dependency + route-walk test) (public commented) · [ ] ownership scope on every lookup/write
- [ ] no mass-assignment · [ ] typed errors, no `str(e)` to client · [ ] logs clean of secrets/PII
- [ ] bound SQL, whitelisted sort · [ ] validated input/uploads · [ ] outbound timeouts + SSRF guard
- [ ] secrets from settings only · [ ] rate limit on costly endpoints

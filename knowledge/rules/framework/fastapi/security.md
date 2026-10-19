---
description: FastAPI auth, authorization, input and secret handling
paths: ["**/auth/**/*.py", "**/security*.py", "**/deps*.py", "**/dependencies*.py", "**/routers/**/*.py", "**/routes/**/*.py", "**/api/**/*.py", "**/main.py", "**/config*.py", "**/settings*.py"]
---
# FastAPI security

- **Deny by default**: every route needs an auth dependency; public routes need an explicit code comment saying why. Enforce structurally: `APIRouter(dependencies=[Depends(get_current_user)])` per router + a test that walks `app.routes` and fails if a route lacks it and isn't on a public allowlist.
- Token verification lives in one dependency module. No ad-hoc `jwt.decode` elsewhere.
- **AuthZ/IDOR**: every resource lookup scoped by the authenticated principal (`WHERE id=:id AND owner_id=:me`). Never trust ids from body/path as ownership proof.
- Per-user data → owner-scoped. Genuinely global data (shared content) → comment it explicitly.
- Validate everything at the edge (Pydantic). Whitelist fields; no mass-assignment from request into ORM (`Model(**body)` of unvetted data).
- Secrets only from settings/env/secret manager. Never hardcode, never log tokens/passwords/keys/PII/full request bodies.
- Error messages generic to clients; detail to logs.
- CORS: explicit origins, no `*` with credentials. Add rate limiting on auth and expensive (LLM/TTS/upload) endpoints.
- File upload: check size, content-type and extension; generate server-side names; no path joins from user input.
- Outbound calls: timeouts always; retry with backoff only if idempotent; validate/allowlist user-supplied URLs (SSRF).
- Dependencies pinned (lockfile); no debug mode/`reload` in prod; docs endpoints gated if API is private.

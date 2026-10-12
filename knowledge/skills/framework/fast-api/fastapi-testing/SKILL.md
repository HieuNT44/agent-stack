---
name: fastapi-testing
description: Write and run pytest tests for FastAPI, async (httpx AsyncClient, AsyncMock) or sync (TestClient), with dependency_overrides for auth and test-first bug reproduction. Project-agnostic. Use whenever adding tests, fixing a bug test-first, or closing coverage gaps for FastAPI routes/services.
---

# FastAPI testing

Rules: `.claude/rules/fastapi-testing.md`. Commands/paths: **Project bindings** (`TEST_CMD`).

## Layout
```
tests/
├── conftest.py        # app, client, auth override, fake principal, db fixtures
├── unit/              # services with AsyncMock repos (no HTTP/DB)
└── integration/       # routes + real test DB
```

## conftest skeleton
First check the repo's existing `tests/conftest.py` and `TEST_LAYOUT` binding: reuse its fixtures and folder layout; the skeleton below is only for repos with none. Make sure auth is overridden (`dependency_overrides[AUTH_DEP]`), not just the DB. httpx ≥0.28 removed `AsyncClient(app=...)`: use `ASGITransport(app=app)`. In non-TTY runs (agents/CI) drop `-it` from `docker exec`.

```python
import pytest, pytest_asyncio
from httpx import AsyncClient, ASGITransport
from <app>.main import app
from <app>.<auth_module> import <AUTH_DEP>

FAKE_USER = <PrincipalDTO>(user_id=1)

@pytest.fixture
def auth_override():
    app.dependency_overrides[<AUTH_DEP>] = lambda: FAKE_USER
    yield
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

`ASGITransport` does **not** run `lifespan`. If the app creates clients/engine/Redis there, wrap with `asgi_lifespan.LifespanManager(app)` or override those dependencies.

Integration DB fixture (transaction per test, rolled back):
```python
@pytest_asyncio.fixture
async def db_session(engine):
    async with engine.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
        app.dependency_overrides[<SESSION_DEP>] = lambda: session
        yield session
        await session.close(); await trans.rollback()
        app.dependency_overrides.pop(<SESSION_DEP>, None)
```
Async engine fixtures: keep engine and tests on the same event loop (pytest-asyncio `loop_scope`), or you get "attached to a different loop".

## Service unit test
```python
# no marker needed when asyncio_mode=auto (strict mode: @pytest.mark.asyncio)
async def test_get_missing_raises():
    repo = AsyncMock(spec=<Entity>RepositoryInterface)
    repo.get_by_id_for_owner.return_value = None
    with pytest.raises(NotFoundException):
        await <Feature>Service(repo).get(1, owner_id=1)
    repo.get_by_id_for_owner.assert_awaited_once_with(1, 1)
```

## Route test matrix (per endpoint)
| Case | Expect |
|---|---|
| valid input + auth | 2xx + body shape |
| invalid body/query | 422 |
| no/invalid token (no override) | 401 (or 403 for `HTTPBearer(auto_error=True)` on older FastAPI — assert what the project's auth dep returns) |
| other user's resource | 403/404 |
| not found | 404 |
| repo raises | 5xx generic message, no leak |

## TDD for bugs (Prove-It)
1. Write test that reproduces bug → run → **must fail** for the right reason.
2. Minimal fix → run → pass.
3. Run full suite; report real output.

## Tips
- `AsyncMock(spec=Interface)` catches typos in method names.
- Override the **dependency callable**, not internals; override the DB/service factory to inject fakes.
- Stub external services (LLM, TTS, S3, Redis) at the client boundary.
- Freeze time (`freezegun`/`time-machine`); never sleep.
- Integration DB: transaction-per-test with rollback, or ephemeral container. Never shared dev DB.

## Sync repos
Use `fastapi.testclient.TestClient(app)` (no `pytest.mark.asyncio`, no `await`), `MagicMock(spec=Interface)` instead of `AsyncMock`. Same override/matrix rules.

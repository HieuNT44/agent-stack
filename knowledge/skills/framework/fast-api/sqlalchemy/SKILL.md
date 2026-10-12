---
name: sqlalchemy
description: SQLAlchemy 2.0 patterns (async and sync): session per request, repository, 2.0-style queries, eager loading, pagination, flush vs commit, error handling, injection safety. Project-agnostic. Use whenever writing or reviewing repositories, queries, sessions or transactions in a FastAPI/SQLAlchemy codebase. Not for ORM-agnostic or raw-SQL-only questions.
---

# SQLAlchemy 2.0 (generic, async + sync)

Rules: `.claude/rules/fastapi-async-db.md`. Real helper names/paths: *Project bindings* in `CLAUDE.md` (`SESSION_DEP`, `LOGGER`). Placeholders below.

## 1. Session lifecycle
- One `AsyncSession` per request from a dependency; never build `AsyncSession()` in controller/service.
- Dependency owns commit/rollback: commit on success, rollback on exception.
- Repos receive `session` in `__init__`, call `flush()` not `commit()` (unless bindings say otherwise).
- Read-only endpoints: use the project's read-only session dependency if it has one (no commit; typically rolls back, which expires loaded attributes — build response DTOs before the session ends). Otherwise the normal session.
- Before changing session options, read the project's actual session setup (`SESSION_DEP`): it may already set `expire_on_commit=False`, use an app-level factory, or have a base repository that already rolls back on error — follow it and note deviations.
- Engine: `create_async_engine(url, pool_pre_ping=True, pool_recycle=1800)` (SQLAlchemy defaults: pool_size=5, max_overflow=10); `async_sessionmaker(engine, expire_on_commit=False)`.

> Caveat: commit in a yield-dependency exit may run after the response is sent (FastAPI ≥~0.118), so a commit failure can't change the HTTP status. For important writes commit explicitly in the service/unit-of-work before returning (or `async with session.begin()`). See `README-fastapi.md` → version-sensitive behaviours.

```python
async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## 2. Writes
```python
self.session.add(entity);            await self.session.flush()   # insert
merged = await self.session.merge(entity); await self.session.flush()  # upsert/update
await self.session.delete(entity);   await self.session.flush()   # delete
```
Wrap in `try/except SQLAlchemyError` → `<LOGGER>(f"<Repo>.<method> failed: {e}")` → `raise`. Never swallow (leaves session dirty). Never log bound params/secrets.

Bulk: `await session.execute(insert(<Entity>), rows)` / `update(<Entity>).where(...).values(...)` instead of loops.

## 3. Queries (2.0 style)
```python
rows = (await self.session.execute(
    select(<Entity>).where(<Entity>.owner_id == owner_id)
)).scalars().all()

one = (await self.session.execute(
    select(<Entity>).where(<Entity>.id == id_, <Entity>.owner_id == owner_id)
)).scalar_one_or_none()
```
No `session.query(...)` (1.x, sync).

## 4. Loading / N+1
Lazy load in async → `MissingGreenlet`. Eager-load explicitly:
```python
select(<Parent>).options(joinedload(<Parent>.owner))          # many-to-one
select(<Parent>).options(selectinload(<Parent>.children))     # one-to-many
```
Never query inside a loop; batch with `.in_(ids)`.

## 5. Pagination & projection
```python
stmt = (select(<Entity>).where(...).order_by(<Entity>.created_at.desc(), <Entity>.id.desc())
        .offset((page - 1) * per_page).limit(per_page))
total = (await session.execute(select(func.count(<Entity>.id)).where(...))).scalar_one()
```
Bound `per_page` (e.g. `le=100`). Large tables: select columns, keyset pagination for deep pages. Index filter/sort columns.

## 6. Injection safety
```python
text("... WHERE name LIKE :q"), {"q": f"%{q}%"}      # binds, never f-string user input
```
Dynamic sort/filter column → whitelist map (`ALLOWED_SORT = {"name": <Entity>.name}`), never `getattr(model, user_value)` unchecked. Escape `%`/`_` if literal match needed.

## 7. Ownership scope (IDOR)
Repo methods that fetch by id take the owner/tenant key and filter on it (`get_by_id_for_owner`). Prefer that over `get_by_id` for user-facing resources.

## 8. Transactions across slow calls
Don't hold a txn across HTTP/LLM/S3: call first, write after. For multi-step atomic writes keep them in one request session.

## 9. Anti-patterns
- ❌ `commit()` in repo · ❌ `session.query` · ❌ manual `AsyncSession()` · ❌ ORM in controller/service
- ❌ unbounded `.all()` · ❌ lazy load after await · ❌ business/HTTP logic in repo · ❌ `create_all` in prod (use migrations)

## 10. Checklist
- [ ] session via dependency · [ ] flush not commit · [ ] `SQLAlchemyError` logged + re-raised
- [ ] 2.0 queries only · [ ] no N+1 · [ ] owner scope on id lookups
- [ ] lists paginated + ordered · [ ] sort/filter whitelisted · [ ] bind params only

## 11. Sync variant
Same rules, different primitives. Check `SYNC_OR_ASYNC` in bindings.
```python
engine = create_engine(url, pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise

rows = session.execute(select(<Entity>).where(...)).scalars().all()   # no await
```
- Routes are plain `def` (threadpool). Never call sync Session from `async def`.
- Lazy loading works but still causes N+1 → keep `selectinload/joinedload`.
- Pool: `pool_size + max_overflow` ≥ concurrent threads that hit DB.

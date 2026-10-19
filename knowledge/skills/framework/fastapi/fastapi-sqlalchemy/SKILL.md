---
name: fastapi-sqlalchemy
description: "SQLAlchemy 2.0 patterns (async and sync): session per request, repository, 2.0-style queries, eager loading, pagination, flush vs commit, error handling, injection safety. Use whenever writing or reviewing repositories, queries, sessions or transactions in a FastAPI/SQLAlchemy codebase. Not for ORM-agnostic or raw-SQL-only questions."
---

# SQLAlchemy 2.0 (generic, async + sync)

Rules: `.claude/rules/fastapi-async-db.md`. Real helper names and paths: the project's `AGENTS.md` or code. Names below are examples.

## 1. Session lifecycle
- One `AsyncSession` per request from a dependency; never build `AsyncSession()` in controller/service.
- Dependency owns commit/rollback: commit on success, rollback on exception.
- Repos receive `session` in `__init__`, call `flush()` not `commit()` (unless the project's session setup says otherwise).
- Read-only endpoints: use the project's read-only session dependency if it has one (no commit; typically rolls back, which expires loaded attributes — build response DTOs before the session ends). Otherwise the normal session.
- Before changing session options, read the project's actual session setup (its session dependency): it may already set `expire_on_commit=False`, use an app-level factory, or have a base repository that already rolls back on error — follow it and note deviations.
- Engine: `create_async_engine(url, pool_pre_ping=True, pool_recycle=1800)` (SQLAlchemy defaults: pool_size=5, max_overflow=10); `async_sessionmaker(engine, expire_on_commit=False)`.

> Caveat: commit in a yield-dependency exit may run after the response is sent (FastAPI 0.118+), so a commit failure can't change the HTTP status. For important writes commit explicitly in the service/unit-of-work before returning (or `async with session.begin()`).

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
Wrap in `try/except SQLAlchemyError` → `logger.error(f"ItemRepository.create failed: {e}")` → `raise`. Never swallow (leaves session dirty). Never log bound params/secrets.

Bulk: `await session.execute(insert(Item), rows)` / `update(Item).where(...).values(...)` instead of loops.

## 3. Queries (2.0 style)
```python
rows = (await self.session.execute(
    select(Item).where(Item.owner_id == owner_id)
)).scalars().all()

one = (await self.session.execute(
    select(Item).where(Item.id == id_, Item.owner_id == owner_id)
)).scalar_one_or_none()
```
No `session.query(...)` (1.x, sync).

## 4. Loading / N+1
Lazy load in async → `MissingGreenlet`. Eager-load explicitly:
```python
select(Order).options(joinedload(Order.customer))          # many-to-one
select(Order).options(selectinload(Order.lines))     # one-to-many
```
Never query inside a loop; batch with `.in_(ids)`.

## 5. Pagination & projection
```python
stmt = (select(Item).where(...).order_by(Item.created_at.desc(), Item.id.desc())
        .offset((page - 1) * per_page).limit(per_page))
total = (await session.execute(select(func.count(Item.id)).where(...))).scalar_one()
```
Bound `per_page` (e.g. `le=100`). Large tables: select columns, keyset pagination for deep pages. Index filter/sort columns.

## 6. Injection safety
```python
text("... WHERE name LIKE :q"), {"q": f"%{q}%"}      # binds, never f-string user input
```
Dynamic sort/filter column → whitelist map (`ALLOWED_SORT = {"name": Item.name}`), never `getattr(model, user_value)` unchecked. Escape `%`/`_` if literal match needed.

## 7. Checklist
- [ ] session via dependency · [ ] flush not commit · [ ] `SQLAlchemyError` logged + re-raised
- [ ] 2.0 queries only · [ ] no N+1 · [ ] id lookups owner-scoped (`fastapi-security`)
- [ ] lists paginated + ordered · [ ] sort/filter whitelisted · [ ] bind params only

## 8. Sync variant
Same rules, different primitives. Use it when the service is sync.
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

rows = session.execute(select(Item).where(...)).scalars().all()   # no await
```
- Routes are plain `def` (threadpool). Never call sync Session from `async def`.
- Lazy loading works but still causes N+1 → keep `selectinload/joinedload`.
- Pool: `pool_size + max_overflow` ≥ concurrent threads that hit DB.

---
name: fastapi-migrations
description: Safe Alembic migration workflow for FastAPI/SQLAlchemy projects: autogenerate, review, backward-compatible steps, up/down test, table ownership. Project-agnostic. Use whenever adding or changing tables, columns, indexes, constraints, enums or data backfills, or when the user mentions alembic, schema change, or migration.
---

# Migrations (Alembic)

Tool/command/owner repo: `MIGRATION_TOOL` in Project bindings. **Confirm which repo owns the table before writing a migration** — never duplicate schema changes across repos.

## Workflow
1. Change the ORM model.
2. Generate: `alembic revision --autogenerate -m "<verb>_<object>"` (run inside the project's container/env, against a **disposable** DB, not shared/prod).
3. **Read the file.** Autogenerate misses: renames (shows drop+add), server defaults, enum changes, check constraints, index/FK names. Fix by hand.
4. Test `upgrade head` → `downgrade -1` → `upgrade head` on a copy with realistic data.
5. Commit model + migration together. One logical change per revision; linear history (resolve multiple heads by merge).

## Safe change patterns (zero-downtime / multi-replica)
| Goal | Do |
|---|---|
| Add NOT NULL column | add nullable (or with server default) → deploy code writing it → backfill (batched) → set NOT NULL |
| Drop/rename column | stop using in code (deploy) → drop later in separate migration; rename = add new + copy + switch + drop old |
| Add index on big table | online/concurrent where DB supports; off-peak; check lock time |
| Change type | add new column + backfill + switch, not in-place on large tables |
| Backfill | batches of N rows, commit per batch, idempotent, resumable |

## Rules
- Never edit a migration already applied in any shared environment; add a new one.
- Down migration works or is explicitly documented irreversible.
- No app imports of live models inside migrations (use `sa.table()`/raw SQL) so later model changes don't break old revisions.
- No `create_all()` outside tests. Run migrations as a separate deploy step, not at each app start.
- Seed/reference data via separate idempotent scripts (natural-key upsert), not mixed with schema revisions.

## Checklist
- [ ] owner repo confirmed · [ ] autogenerate output reviewed · [ ] up/down/up tested
- [ ] backward compatible with currently deployed code · [ ] big-table lock/backfill considered

## env.py essentials
- Async engine: run via `connection.run_sync(do_run_migrations)` inside `asyncio.run` (Alembic's `-t async` template).
- `compare_type=True` (and `compare_server_default=True`) in `context.configure`; import all models so metadata is complete.
- `MetaData(naming_convention=...)` so constraint/index names are deterministic (autogenerate + downgrades work).
- CI: `alembic check` (model vs head drift) and `alembic heads` (single head).
- MySQL/MariaDB: DDL is non-transactional → a failed upgrade can leave partial state; keep revisions small, review with `alembic upgrade head --sql`, test on a throwaway DB.

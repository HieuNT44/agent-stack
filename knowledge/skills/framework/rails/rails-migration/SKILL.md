---
name: rails-migration
description: Change a Rails database schema safely — add, backfill, rename, or drop a column or table without downtime or data loss. Use when writing a migration, planning a backfill, or splitting a destructive schema change across deploys.
---

A migration runs against production data while the old code is still serving
requests. Plan for both versions of the code running at once.

## 1. Classify the change

| Change | Safe in one deploy? |
| --- | --- |
| Add a nullable column | yes |
| Add an index | yes; on a large PostgreSQL table with `disable_ddl_transaction!`, `algorithm: :concurrently`, `if_not_exists:` and explicit `up`/`down` |
| Add a column with a default | yes on PostgreSQL 11+ / MySQL 8+, otherwise backfill separately |
| Backfill data | no — a data migration or a rake task, in batches |
| Add `null: false` | no — only after the backfill has finished |
| Rename a column | no — add, dual-write, migrate readers, drop |
| Drop a column or table | no — stop using it first, drop one deploy later |

Anything in the "no" column is a sequence of deploys. Write out the sequence before
writing the migration.

## 2. Write it

Read `.claude/rules/rails-migrations.md` first, then write one migration per schema
change. A data backfill is not a migration: write it as the rule and
`rails-lib.md` describe (batched, resumable, logged), and run it between the deploys the
sequence names.

## 3. Verify

- Run `rails db:migrate`, then `rails db:rollback`, then migrate again. A migration
  that cannot roll back is not finished.
- Check the resulting `db/schema.rb` diff: it should contain exactly the intended
  change and nothing else.
- Confirm the app boots and the affected specs pass against the new schema.

## 4. Check the diff against the rules

As `rails-structure.md` says, check `git diff` against the rules of the layers you
touched.

## 5. Report

State the deploy sequence, which step this change is, and what must happen before the
next one.

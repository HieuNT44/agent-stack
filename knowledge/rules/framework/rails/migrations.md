---
paths:
  - "db/migrate/**/*.rb"
  - "db/data_migrations/**/*.rb"
---

# Rails Migrations

- Name a migration after what it does (`AddIndexOnArticlesStatusAndPublishedAt` adds
  exactly that index; dropping the index it makes redundant is part of the same change).
  One schema change per migration. Never edit a migration that has
  run in any shared environment; write a new one.
- Reversible: `change` only when Rails can invert every statement, otherwise explicit
  `up` and `down`.
- Let Rails name an index. Pass `name:` only for an expression index
  (`t.index "lower(email)", name: "index_users_on_lower_email"`), or a multi-column index
  whose default name is too long: Rails 7.1+ shortens it to an unreadable `idx_on_..._<hash>`, and older
  versions raise (`name: "index_comments_on_article_id_and_deleted_at"`).
- An index whose columns are a leading prefix of another index is redundant: drop it in
  the migration that adds the wider one.
- Index on a large PostgreSQL table: `disable_ddl_transaction!`,
  `algorithm: :concurrently`, `if_not_exists:`/`if_exists:`, and explicit `up`/`down`:
  ```ruby
  class AddIndexOnArticlesPublishedAt < ActiveRecord::Migration[7.1]
    disable_ddl_transaction!

    def up
      add_index :articles, :published_at, algorithm: :concurrently, if_not_exists: true
    end

    def down
      remove_index :articles, :published_at, algorithm: :concurrently, if_exists: true
    end
  end
  ```
- Data changes are separate from schema changes: never load models or update rows in
  `db/migrate/`. A small data fix goes in `db/data_migrations/`; a long batched backfill
  is a rake task.
- A migration is a snapshot: write a limit there as a literal, never read config or a
  model. On SQLite, which ignores `limit:` on strings, bound it with a check constraint
  (`length(title) <= 200`) instead. When the same limit also lives in config, a spec writes `max + 1` through the
  column to prove the two agree.
- Back every uniqueness check with a unique index, every required column with
  `null: false`, every bounded value with `limit:` or a check constraint, and every
  `belongs_to` with a foreign key.
- A destructive change spans deploys: add the new column, backfill in batches, switch
  the code, drop the old column in a later release. Add `null: false` only after the
  backfill has finished on production data.

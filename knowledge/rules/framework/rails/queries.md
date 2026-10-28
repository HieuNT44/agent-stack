---
paths:
  - "app/models/**/*.rb"
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
  - "app/jobs/**/*.rb"
  - "lib/**/*.rb"
  - "app/controllers/**/*.rb"
---

# Rails Queries

- Build queries by chaining scopes. A `where` chain written twice becomes a scope.
- Preload every association the serializer, decorator or view reads. An N+1 in a list is
  a defect. `includes` by default; `preload` for several `has_many` or a large set;
  `eager_load` only to filter or sort on the association, never with several `has_many`:
  the join multiplies rows.
- After `includes`, count with `size`, not `count`, which runs a new query.
- Never run a query inside a loop over records. Batch with `where(id: ids)` or a join.
- Iterate anything that can grow past a few thousand rows with `find_each` or
  `in_batches`. Both walk the primary key and ignore the relation's `order`; when order
  matters, page by key instead.
- `pluck` when only values are needed, not records. `select` only to leave out a large
  column the code never reads (`text`, `json`, a blob) or when a query is measured slow:
  a record loaded with `select` raises `MissingAttributeError` the day a serializer or
  decorator reads another column.
- `exists?` to test for a row you will not use; when the records are used right after,
  load them once and test the loaded set.
- Count, sum and group in SQL, in the service object or a model reader, never in a
  serializer, decorator or component; pass the result in. Never `association.count` per
  record in a list: one grouped count per page (`where(id: ids).group(...).count`) is
  fine; move to a `counter_cache` (or a counter table) when that count is measured slow.
- Paginate every list that can grow, after filtering and ordering. Cap the page size with
  a configured maximum so a client cannot ask for every row, and end the order on a
  unique column (`order(created_at: :desc, id: :desc)`) or rows repeat across pages. On a
  table of millions of rows, deep `OFFSET` pages get slow: page by key
  (`where("id < ?", last_id).limit(n)`) instead.
- Read-modify-write on a row concurrent requests can touch: `with_lock`/`lock!`.
  Counters: `update_counters` or a DB-side increment, not `count += 1; save`.

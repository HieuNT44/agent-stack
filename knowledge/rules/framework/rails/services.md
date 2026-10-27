---
paths:
  - "app/services/**/*.rb"
  - "app/operations/**/*.rb"
  - "app/interactors/**/*.rb"
---

# Rails Service Objects

A service object holds the business logic of one use case, usually one controller
action. Projects call it a service, operation or interactor; the directory and suffix
are the project's, the rules are the same. Copy the naming of the existing ones.

## Shape

- Inherit the base class (`ApplicationService`, or the project's own); see below when
  there is none yet.
- A service object's namespace follows its controller's:
  `Public::Articles::CommentsController#index` → `Public::Articles::Comments::IndexService`.
- One public entry point, `call`. Outputs are `attr_reader`s. Everything else is
  `private`.
- `call` only lists the steps, each a private method, so the use case reads top to
  bottom. Other private methods are helpers for those steps:
  ```ruby
  def call
    authorize!
    validate!
    create_article!
    enqueue_notifications
  end
  ```
- Step names carry the prefix `AGENTS.md` records: none by default, or `step_*`
  (`step_validate!`) so steps stand apart from helpers. When the first base class is
  created and `AGENTS.md` records no choice, ask with the AskUserQuestion tool (no prefix
  recommended) and record the answer there.
- A variant of a use case (another actor, another version) inherits the original and
  overrides only the steps that differ, calling `super` where it extends. A step the
  variant does not need is overridden with an empty method; `call` is not re-listed.
- Never call another service object. Share code through inheritance or a mixin placed
  at the narrowest scope that has two users; with one user it is a private method.
  When a second service would repeat a step word for word, move the step to the shared
  parent or mixin in the same change.

## When the project has no base class yet

Create one. The controller passes what the use case needs as keywords, and the base class
keeps each behind a reader:

```ruby
# app/services/application_service.rb
class ApplicationService
  attr_reader :params, :session, :cookies, :current_user

  def initialize(params = {}, **context)
    @params       = params
    @session      = context[:session]
    @cookies      = context[:cookies]
    @current_user = context[:current_user]
  end

  def call
    raise NotImplementedError
  end
end
```

Add a reader per actor the app has (`current_admin`). The directory and the class name
follow the project's name for the layer (`ApplicationOperation` in `app/operations`).

## Input and validation

- Permit params in a private method of the service, not in the controller.
- Validation is its own step, before any write: build the form object for this use case
  (the first one also creates `ApplicationForm`) and raise when it is invalid. Only where
  `AGENTS.md` records that the project validates in models, validate there instead. Do
  not interleave checks with writes.
- A use case with nothing to validate has no form and no validation step.

## Loading and writing

- Load a record the actor owns through its associations: `current_user.articles.find(id)`,
  not `Article.find(id)`. Load one it may act on but does not own (another user's
  article to comment on) through the authorization scope (`policy_scope`,
  `accessible_by`). A record the actor owns under a parent it does not (its own comment
  on another user's article): the parent through the scope, then the record through the
  actor (`current_user.comments.find(id)`). Either way the lookup is the boundary; a bare
  `find` lets any id through, and a record the actor cannot reach is a 404.
- Preload every association the serializer, decorator or view reads, and compute
  aggregates here; pass them to the presentation layer.
- Writes to more than one row or table go in one `ActiveRecord::Base.transaction`.
- Enqueue jobs, write caches and send mail after the transaction commits, never inside
  it: a rolled-back transaction cannot take back a job already sent.
- A contended resource is guarded by a database constraint when one can express it (a
  unique index; the insert and its `ActiveRecord::RecordNotUnique` handling as
  `rails-security.md` describes); otherwise by a lock: a row lock (`with_lock`, `lock!`)
  for one record, or the project's distributed lock for anything wider. Lock keys come
  from config.
- A method that writes ends in `!`.

## Failure

- A business failure raises the project's error class. Never return `false` or an
  error string for the controller to inspect.
- When the project authorizes in the service layer, a class-level check is the first
  step; a record-level check runs right after the step that loads the record. A use case
  whose only permission depends on the record has no class-level step. When the lookup
  itself enforces the permission (the record is found through `current_user.comments`,
  so it is the actor's), that lookup is the check: no `authorize` step that can never
  fail. The same holds when authentication already guarantees the permission (any
  signed-in user may comment); see `rails-authorization.md`.

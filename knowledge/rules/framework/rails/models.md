---
paths:
  - "app/models/**/*.rb"
---

# Rails Models

## The model file is declarations

- `app/models/<model>.rb` holds declarations only: `include`s, constants,
  `class_attribute`, associations, scopes, `delegate`, and the macros of the gems the
  project uses. Methods live in concerns, so the model file
  stays a readable table of what the model is. The exceptions are class methods a gem
  requires on the class itself, such as Ransack's `ransackable_attributes`, and the
  defaults other rules place in the abstract `ApplicationRecord`.
- No validation and no callback in a model. The form object of each use case validates
  its input, and work around a write is a step of the service object. A model-level
  validation or callback is only for an invariant every write path must keep and the
  database cannot enforce. Before adding one, ask the user with the AskUserQuestion
  tool, stating why the form and the database constraint are not enough.
- Declare each association, scope and `delegate` once.
- Align the arguments of consecutive one-line declarations into columns. A blank line
  starts a new group.

```ruby
class Article < ApplicationRecord
  include Article::Reader
  include Article::Writer

  belongs_to :user
  has_many   :comments, dependent: :destroy

  scope :by_user,         ->(user) { where(user:) }
  scope :order_by_recent, -> { order(published_at: :desc) }
end
```

## Methods live in concerns

- `app/models/concerns/<model>/`, one module per role, `extend ActiveSupport::Concern`:
  - `reader.rb`: queries and computations, no writes;
  - `writer.rb`: methods that write;
  - `callback.rb`: the methods of an approved callback;
  - more (`repository.rb` for complex SQL, `counter.rb`, `cache.rb`) when the model needs
    them.
- A method that writes ends in `!`; a predicate ends in `?`.
- A writer that changes state checks its own precondition and raises when it does not
  hold (`publish!` raises unless the record is a draft), never returns quietly, so every
  caller gets the guard, not only the one service.

## Declarations

- Scope names start with `with_`, `without_`, `by_` or `order_by_`, so a chain reads as
  a sentence. One line `-> { }`, multi-line `lambda { }`.
- Every `has_many`/`has_one` declares `dependent:`, even `dependent: nil`, so deleting a
  parent is a decision, not an accident.
- A value only the model's own code reads is a constant (`TOKEN_LENGTH = 32`). A value
  read outside the model (a form, a service, a view) goes in
  `class_attribute :configs, default: { ... }`, read with `Article.configs.fetch(:key)`
  so a missing key raises instead of returning `nil`.
- A secondary database has an abstract `<Db>::ApplicationRecord` with `connects_to`.
- A model may call `lib/`. It never enqueues jobs (the service object does, after the
  transaction commits) and never calls a service object, form, serializer or decorator.
- An approved callback touches only the record's own data. Side effects on other
  records, mail or external calls belong in the service object.

## Integrity

- Integrity lives in the database: a unique index for uniqueness, `null: false` for
  required columns, `limit:` or a check constraint for bounds (a check constraint on
  SQLite, which ignores `limit:` on strings), a foreign key for every
  `belongs_to`. The form reports a bad value to the user; the constraint stops every
  other write path, and two concurrent requests that both passed a check.
- Index every column used in a `where`, a join or an `order` on a growing table.

---
paths:
  - "app/forms/**/*.rb"
  - "app/validators/**/*.rb"
---

# Rails Forms and Validators

All input validation lives in form objects, not in models. A form object validates the
input of one use case; only the service object of that use case builds it, in its
validation step.

## Forms

- `app/forms/<namespace>/<action>_form.rb`, inheriting `ApplicationForm`, which includes
  `ActiveModel::Model` and `ActiveModel::Attributes` and raises the project's 422 error
  from a bang method such as `valid!`. The error carries the form (`error.form`), so an
  HTML handler can render it again with its input and errors.
- Name the form after the same namespace and action as its service object.
- Declare every input with `attribute :name, :type`, type always given. No
  `attr_accessor`: an untyped attribute skips casting, so `"0"` stays truthy.
- Array and hash inputs use types registered with `ActiveModel::Type.register` in an
  initializer.
- A base form shared by several actions holds the common attributes; each child declares
  only what it adds. Reuse a form by inheritance, never by building another action's form.
- A form checks the input, not the record's state: whether an article may still be
  published is the model writer's precondition (`rails-models.md`).
- Custom validation: `validate :must_<condition>` with a `private` method, guard clause
  first:
  ```ruby
  validate :must_be_in_future

  private

  def must_be_in_future
    return if scheduled_at.blank? || scheduled_at.future?

    errors.add(:scheduled_at, :must_be_in_future)
  end
  ```
- `errors.add(:attr, :symbol_key)`, never a message string; the message comes from i18n.
- `inclusion:` reads its list from the source (`Article.status.values`, config), never a
  literal list, except `[true, false]`.
- Numeric limits come from config. A limit that protects stored data (length, range)
  also lives in the column (`limit:`, or a check constraint on SQLite, which ignores
  `limit:` on strings), so every write path keeps it;
  the form adds the checks of its own use case.
- No DB access in a form other than a custom validator in `app/validators/` that checks
  existence or uniqueness. `uniqueness:` belongs to Active Record and raises
  `Unknown validator: 'UniquenessValidator'` on an `ActiveModel::Model` form, and Rails
  ships no `existence:` validator.
- Nested hash input → validate it with its own form and copy its errors onto the parent
  key.

## Validators

- `app/validators/<name>_validator.rb` → `<Name>Validator < ActiveModel::EachValidator`,
  implementing `validate_each`.
- Used by key: `validates :url, url: true`.
- Start with `return if value.blank?` and leave presence to `presence:`; report with
  `record.errors.add(attribute, :symbol_key)`.

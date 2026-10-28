---
paths:
  - "app/errors/**/*.rb"
  - "app/controllers/**/*.rb"
---

# Rails Errors

Follow the project's error mechanism. Read how an existing action fails (the error class
it raises and where that error becomes a response) before adding a failure. The rules
below hold whatever the mechanism is.

- One place turns errors into responses: a `rescue_from` handler in the base
  controller or a concern. An action never rescues to render an error by hand.
- Every error response has the same body shape and a fixed code the client can match.
  A validation error adds per-field error keys under one fixed key
  (`details: { body: [:too_long] }`); other errors leave it out. Never put SQL, file
  paths, stack traces or exception class names in it.
- A business failure raises; it never returns `false` or an error string for the
  caller to inspect.
- Exceptions from gems (`ActiveRecord::RecordNotFound`, `Pundit::NotAuthorizedError`,
  `CanCan::AccessDenied`) are mapped to the app's errors in that one place. With both an
  API and HTML pages, one shared concern holds the mapping; each format's handler only
  decides how to render, and every base controller (API and HTML) includes one.
- The `StandardError` catch-all also overrides Rails' own status mapping, so map the
  framework's client errors explicitly: `ActiveRecord::RecordNotFound` → 404,
  `ActionController::ParameterMissing` and `ActionDispatch::Http::Parameters::ParseError`
  → 400.
- The central handler alone catches `StandardError`, to render the standard 500 body and
  report it. Register that `rescue_from` first: later ones take precedence, so the
  specific mappings still win. Anywhere else, rescue the narrowest class that can be
  raised, never `Exception`. Never swallow an exception: re-raise it or report it.
- Report every 500 to the error tracker with the filtered params and the user's id and
  role, and nothing more. Do not report 4xx: they are the client's mistakes, not defects.
- A message is for the log and the error tracker only, never rendered: it carries ids,
  never personal data or secrets. The response body comes from `code`, and text the user
  sees is an i18n key.

## When the project has no error classes yet

Start with one base class carrying its HTTP status and code, one subclass per file:

```ruby
# app/errors/application_error.rb
class ApplicationError < StandardError
  class_attribute :status, :code
end

# app/errors/not_found_error.rb
class NotFoundError < ApplicationError
  self.status = :not_found
  self.code   = :resource_not_found
end
```

Adding an error is then adding a file; the handler reads `error.status` and
`error.code`, with no central `case` to grow.

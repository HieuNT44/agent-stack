---
paths:
  - "spec/**/*.rb"
---

# Rails Specs

## Layout

Small spec files grouped in directories, so a spec stays readable as the app grows:

- Most layers mirror the source, one spec file per source file:
  `app/services/articles/create_service.rb` →
  `spec/services/articles/create_service_spec.rb`; `lib/<path>.rb` →
  `spec/lib/<path>_spec.rb`. A file that grows past a handful of public methods splits
  into a directory, one file per method.
- A model gets a directory, split by what is tested:
  `spec/models/article/associations_spec.rb`, `spec/models/article/reader/<topic>_spec.rb`,
  `spec/models/article/writer/<topic>_spec.rb`, one topic per business behaviour
  (`writer/publish_spec.rb`). Also, when the model has them: `constraints_spec.rb` for
  database constraints, `scopes_spec.rb`, and one file per gem behaviour
  (`soft_delete_spec.rb`, `<attribute>_spec.rb` for an enumerized attribute).
- A system spec: `spec/system/<namespace>/<resource>/<behaviour>_spec.rb`, one file per
  behaviour the user sees.
- A controller or request spec gets a directory per resource and one file per
  endpoint: `spec/requests/v1/articles/index_spec.rb`, `.../create_spec.rb`.
- Setup shared by the files of one scope (signing in, building a screen's records) goes
  in `shared_context/<name>.rb` inside that scope's directory and is loaded with
  `require_relative` by the specs that use it. Prefer a factory trait when the shared
  part is just data.
- Shared examples live in `spec/support/shared_examples/` and only for behaviour that
  holds across many specs (`it_behaves_like "an endpoint that requires sign-in"`).
  Logic of one screen is a `shared_context` in its scope, not a shared example. Load
  `spec/support/` by enabling the `Dir[Rails.root.join("spec/support/**/*.rb")]` line in
  `spec/rails_helper.rb`.
- A case that fits none of these: ask the user with the AskUserQuestion tool before
  inventing a layout.

## Independence

Every spec passes alone, in any order, and in parallel:

- `config.order = :random` in `spec/spec_helper.rb`; a failure that depends on the seed
  is a bug in the spec.
- No records created in `before(:all)`/`before(:context)`; use `let`/`let!` and factories.
- Unique values through factory `sequence`s; never a fixed id, email or file path that
  another example or process can also use.
- Freeze time with `travel_to` (or `freeze_time`) when an assertion compares a time value.
  For relative output ("3 hours ago"), wrap both the record's creation and the call in
  the same `travel_to` block. `travel_to` moves only Ruby's clock: a system spec that
  checks time the browser computes creates the record relative to now and asserts text
  that holds for the whole run. To assert that a
  timestamp did not change, move the clock forward (`travel 1.minute`) before the call.
- Assert an order only on a query with an explicit `order`.

## Conventions

- Infer the spec type from the path, configured once in `spec/rails_helper.rb`; do not
  write `type:` by hand:
  ```ruby
  config.infer_spec_type_from_file_location!
  %w[service form policy decorator component blueprint].each do |layer|
    config.define_derived_metadata(file_path: %r{/spec/#{layer}s/}) { |meta| meta[:type] ||= layer.to_sym }
  end
  ```
- `context 'when ...'`, `it 'returns ...'`.
- A spec calls the code it guards, and wraps that call in `expect { ... }` when it checks
  a change. Never re-create a query or copy domain logic (a token format, a price rule)
  into a spec or a factory: the copy stays green when the real method changes.
- Assert errors by class (`raise_error(ForbiddenError)`), never by message.

## By layer

- A class that only inherits (an empty form, a variant service) has no spec of its own.
  A variant's spec covers only the steps it overrides.
- The central error handler: one controller spec on an anonymous controller
  (`controller(ApiController) { def index = raise NotFoundError }`) per mapping, asserting
  status, body and whether it was reported.
- No spec on query plans, index names or `EXPLAIN` output: they are engine-specific. A
  fix for an N+1 asserts the number of queries instead.

- Service object: build it with `ActionController::Parameters.new(...)` and the actor,
  then `call`. One example per step outcome, including each error it raises.
- Form: one example per validation it declares; one inherited from a base form is
  specced once, on the base form. Assert the error key, ignoring the extra detail keys
  some validators add (`count:`, `value:`):
  `expect(form.errors.details[:body]).to include(a_hash_including(error: :too_long))`.
- Blueprint: compare the whole Hash with `eq`, one example per view.
- Decorator: `build_stubbed` records, `eq` on the output, one example per fallback.
- Turbo Stream response: a request spec sending `as: :turbo_stream`, asserting the
  status and the `<turbo-stream action="..." target="...">` it returns.
- Stimulus behaviour: a system spec in `spec/system/`, driven by a JavaScript driver, when
  the project has one; without a driver, say the behaviour is untested rather than
  installing one unasked.
- Component: `render_inline`, then `have_css`/`have_text`; one example per variant, per
  slot, and for `render?` returning false. Never `page.css(...).text` with `eq`:
  ```ruby
  render_inline(described_class.new(article:))

  expect(page).to have_css("h2", text: article.title)
  ```
- Request spec: the status, the envelope's top-level keys (`data`, `meta`, `error`) and
  the id of what came back; not the serialized fields, which the serializer spec covers,
  and not the business logic, which the service spec covers. An error is asserted by its
  status and its `code` (and, for a 422, the field names under `details`): the code is
  the client's contract. One example per error status the endpoint returns, not one per
  input that triggers it. Sign-in and other shared
  setup come from a `shared_context`; the 401 case from a shared example. For an HTML
  page: the status, that the main element renders, and the branches of the view itself
  (the empty state). An API
  documented with rswag keeps its spec in `spec/integration/` and ends with `run_test!`.

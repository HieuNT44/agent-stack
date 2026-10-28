---
name: rails-feature
description: Implement a Rails endpoint or screen layer by layer — route, thin controller, service object, form, serializer or decorator/component, errors and specs — copying the project's existing shape, then prove it with RuboCop and RSpec. Use when adding a new endpoint or screen to a Rails codebase, or extending an existing feature with new behaviour (a new field, a new section or format on a page, a new filter, a notification such as an email, data from an external service). Not for fixing a bug in existing behaviour.
---

A request flows route → controller → one service object → controller renders. Each
layer has its rule in `.claude/rules/rails-*.md`, loaded when you read a file of that
layer. Read before you write, layer by layer.

## 1. Locate before you build

- Read `config/routes.rb` and find the closest existing resource.
- Read one controller, its service object, form and serializer (or decorator and
  component) that already do something similar. The new code copies their shape:
  directory, naming, base class.
- Search `app/models` for the domain nouns, and the service directory for a mixin that
  already does part of the work.

State what you found. If the behaviour exists, extend it instead of adding a parallel
path.

## 2. Design the change

Name, in one line each:

- the route: resource, action, and URL. An action outside the seven REST actions is a
  new resource, not a `member`/`collection` route;
- the namespace shared by controller, service object, form and serializer;
- the steps the service object's `call` lists;
- whether the use case needs a form (it takes input to validate) or not;
- the response: a serializer for JSON, or a decorator and component for HTML;
- each failure, and the error class it raises;
- what persists, and whether it needs a migration (use the `rails-migration` skill);
- whether it takes from a limited shared resource (stock, quota, slots): then it ships the
  concurrent test `rails-security.md` describes.

If two designs are reasonable, say which you picked and why.

## 3. Route

- Add `resources`/`resource` with `only: %i[...]` inside the right namespace.
- Run `bin/rails routes -g <resource>` and confirm the controller#action you expect.

## 4. Build each layer

Build in this order, skipping a layer the change does not need: controller, service
object, form object, response (serializer, or decorator and view for HTML), browser
behaviour and styling, errors.

For each layer, Read its rule in `.claude/rules/` (`rails-controllers.md`,
`rails-services.md`, `rails-validations.md`, `rails-json.md` or `rails-views.md`,
`rails-hotwire.md`, `rails-tailwind.md` or `rails-bootstrap.md`, `rails-errors.md`) and
one existing file of the layer, then write the code. Add the i18n
keys it uses.

**Done when** every layer named in step 2 exists.

## 5. Specs

Write the specs where `rails-specs.md` lays them out: one file per service object, form
and serializer; one request spec file per endpoint; model specs in the model's
directory.

## 6. Verify

Run the project's lint and test commands (from `AGENTS.md`, else `bundle exec rubocop`
and `bundle exec rspec`) on the changed paths, then on the touched directories. Fix every
offence in the code; do not disable a cop to get green.

## 7. Check the diff against the rules

As `rails-structure.md` says, check `git diff` against the rules of the layers you
touched.

## 8. Report

State the route, the files added or changed per layer, the commands you ran with their
result, and anything you deliberately left out.

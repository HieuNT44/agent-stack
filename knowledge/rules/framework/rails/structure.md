# Rails Structure

Every layer below has its own rule in `.claude/rules/rails-*.md`. A layer rule loads only
once you read or edit a file of that layer, so:

- **Before creating a file in a layer, Read one existing file of that layer, or its base
  class.** That loads the layer's rule and shows the project's own shape. Copy it. When
  the layer has no file yet, Read its rule in `.claude/rules/` instead.
- A concern the project does not handle yet goes in the layer the table below names.
  Do not add a second layer for a job the project already does elsewhere (interactors
  beside services, form objects where `AGENTS.md` says models validate) unless asked.
- Group code by namespace: a domain is a directory in every layer
  (`app/services/articles/`, `app/forms/articles/`, `spec/services/articles/`), one class
  per file, so where a new file goes follows from its namespace.
- When a rule contradicts `AGENTS.md` or what the existing code consistently does, do
  not pick a side. Name the rule, the line, and two or three files that disagree, and ask
  the user. They settle it by editing `AGENTS.md`, the rule, or the code; until then a
  guess in either direction spreads the inconsistency.
- Ask the user with the AskUserQuestion tool, not in chat: concrete options, the
  recommended one first and marked as such.
- If `AGENTS.md` is missing, still holds template placeholders (`<!-- ... -->`), or says
  nothing about where business logic and validation live, say so before the first task
  and ask the user to run `/rails-doctor`, which fills it from the code.

## What goes where

| Code | Layer |
| --- | --- |
| HTTP: params in, render or redirect out | controller |
| Business logic of one use case | service object (`app/services`, `app/operations`, `app/interactors`) |
| Input validation for one use case | form object (`app/forms`) |
| Associations, scopes, persistence | model |
| Who may do what | authorization (`app/policies`, or `app/models/ability.rb`) |
| JSON shape | serializer (`app/blueprints`) |
| Display logic for one record | decorator (`app/decorators`) |
| Reusable UI | component (`app/components`) |
| Browser behaviour the server cannot render | Stimulus controller (`app/javascript/controllers`) |
| Styling | the project's CSS framework (Tailwind or Bootstrap), in templates and components |
| Async work | job (`app/jobs`) |
| An error the app returns | the project's error classes (often `app/errors`) |
| Code with no Rails dependency | `lib/` |

## Call flow

- Request → route → controller → one service object → controller renders.
- A service object calls forms, authorization, models, `lib/`, and enqueues jobs. It never
  calls another service object; share code by inheritance or a mixin.
- A model calls `lib/`; never a job, a service, a form, a serializer or a decorator.
- A job calls models and `lib/`.
- Serializers, decorators, components, helpers and views read loaded data only: no
  query, no write, no side effect.

## Everywhere

- Namespace = directory path (Zeitwerk). Every class carries its layer suffix
  (`Controller`, `Form`, `Policy`, `Job`, ...).
- No tunable value (a limit, a threshold, a key, a duration, a list of allowed values)
  as a literal in logic: read it from config. Code structure is not config: column
  lists, DOM ids, stream names, and a map from an input key to code (sort key → scope)
  are constants in the class that uses them.
- Before reporting done, run the project's own linter and tests on what you changed,
  and read `git diff` against the rule of each layer you touched; fix each line that
  breaks one, or say why it has to.

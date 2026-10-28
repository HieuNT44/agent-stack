---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.erb"
---

# Code Comments

A comment earns its place when it tells the reader something the code cannot: why it
is this way, what constraint it protects, what breaks if it changes. Anything else is
noise, and noise drifts out of date while the code moves on.

This applies to the comments and names you add or change. An existing comment that
breaks it is reported, not rewritten, unless the task is to clean it up: it may carry a
reason only its author knew. A comment your change makes false is updated in the same
change.

## Before writing one

- [ ] The code cannot say it. Within the code you are writing, try a better name, an extracted function or a type first. Renaming an existing or public name to avoid a comment is a bigger change than the comment.
- [ ] It says *why*, not *what*. `# retry: the payment API drops the first call after idle`, not `# call API again`.
- [ ] It is true of the code as it stands now, not a story of how the code got here.

## Self-contained

A reader has this file and the repository, nothing else: not the chat, the plan, or the
ticket board that produced it.

- [ ] No pointer to something that changes or disappears: design-doc sections (`§5.2`), plan or task IDs (`T0.1`), phase names (`Phase 2`), status markers (`🔴`, `🟢`). State the rule itself, or point to a file kept in the repository.
- [ ] An issue link is fine as a source, not as a substitute: the comment still states the rule.
- [ ] No jargon defined only outside the repository. Define it once, where it is introduced.
- [ ] New identifiers follow the same rule: name by function (`test-queue`), not by plan item (`A0SetupTestQueue`).
- [ ] No session traces: "as discussed", "per user request", "the fix above", "updated to", "changed from X to Y", "new:". Git records the history; the comment records the rule.
- [ ] No wording relative to an earlier version of this code: "now", "no longer", "previously". Write as if the current rule were the only one there ever was. A rejected alternative is a *why* and stays: `# poll instead of webhook: the vendor drops webhooks under load`.
- [ ] No narration: "Here we…", "Let's…", "This function will…".

## Not over-explained

- [ ] It does not restate the line below it (`# increment counter`).
- [ ] One reason, one place: explain at the definition, not at every call site. A call site gets its own comment when the reason belongs to that call.
- [ ] A docstring does not paraphrase the signature. Document a parameter only for what the type hides: unit, range, ownership, the error it raises.
- [ ] It does not teach the language or framework.
- [ ] Length follows surprise. One line covers most *why*s; a paragraph is for a non-obvious invariant, a workaround, or a trap.
- [ ] Density matches the surrounding file, but a needed *why* is not dropped because the file has none.

## Workarounds and facts that rot

- [ ] A workaround names what it works around (library and version, bug link, model ID) and the condition for removing it. Without that, nobody dares remove it.
- [ ] No value copied from config or another file: the copy goes stale without a sound. Point to where it lives. A value with no home elsewhere (`# 86400: one day in seconds`) is fine; do not create a config entry just to avoid the comment.
- [ ] `TODO` marks a decision the spec leaves open; `FIXME` marks known-weak code that works. Leave one rather than guess at the spec — but make it stand alone: what is open or weak, why it was not settled here, and what settles it (`# TODO: refund cap unspecified; capped at order total until product sets a limit`). A bare `TODO: fix later` tells the next reader nothing.
- [ ] No commented-out code. Git keeps it.
- [ ] "temporary" or "hack" only together with the condition that ends it.

## Directives are not comments

- [ ] Magic comments (`# frozen_string_literal: true`) and linter directives are
  configuration, not prose; this checklist does not apply to them. A
  `# rubocop:disable` still carries its reason on the same line (`-- builds the full
  export row`), as `rails-style.md` says.

## Tone

- [ ] Plain voice. `IMPORTANT` / `NEVER` in caps only for a real hazard, with the reason next to it.

## Before calling the change done

Grep the added lines, then read each new comment as a teammate who has only this file:

```bash
git diff -U0 | grep -nE '^\+.*(§|T[0-9]+\.[0-9]|Phase [0-9]|🔴|🟢|as discussed|per (the )?user|previously|no longer|changed (from|to)|updated to|XXX|(TODO|FIXME)[: ]*([^ ]+ ?){0,3}$)'
```

Every hit gets rewritten or has a reason to stay. The grep catches patterns only; the
reading decides whether the comment says something the code does not.

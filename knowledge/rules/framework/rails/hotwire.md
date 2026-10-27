---
paths:
  - "app/javascript/**/*.js"
  - "app/views/**/*"
  - "app/components/**/*"
---

# Hotwire: Turbo and Stimulus

Applies only when the `Gemfile` includes `turbo-rails` or `stimulus-rails`; otherwise
ignore this file.

The server renders HTML. Turbo navigates and updates parts of the page; Stimulus adds
the behaviour the server cannot: toggling, counting, copying, dragging. JavaScript never
fetches JSON to build HTML, and holds no business logic, permission or validation: those
stay in the service object, policy and form.

## Where JavaScript goes

| Code | Place |
| --- | --- |
| Entry point: imports, `Application.start()`, global Turbo config, the global error reporter, the `turbo:before-cache` teardown call | `app/javascript/application.js`, nothing else |
| Base for every controller: `handleError` and shared lifecycle hooks only. Every controller extends it; the first controller creates it | `app/javascript/controllers/application_controller.js` |
| A behaviour | `app/javascript/controllers/<name>_controller.js`, one per behaviour; a subdirectory becomes `--` in the identifier (`admin/users_controller.js` → `admin--users`) |
| A role several controllers act as ("acts as") | `app/javascript/controllers/mixins/use_<role>.js`, attached in `connect()`: `useOverlay(this)` |
| A pure function, or an adapter around a library or service ("has a") | `app/javascript/lib/<topic>.js`; with importmap, `pin_all_from "app/javascript/lib", under: "lib"` |

## Stimulus

- Name a controller by its behaviour, never by its page (`toggle`, `character-counter`,
  not `article-page`). One responsibility each; a page combines several controllers.
- Reach the DOM through targets, `this.element` or outlets only. Never `querySelector`
  or `document.querySelector` outside the controller's element. A controller acts either
  on `this.element` or on its targets; needing both means two controllers.
- Configuration lives in the markup: `static values`, `static classes`, `static targets`.
  No class name, URL, number or user-facing text hardcoded in JavaScript; text comes
  from the view, through i18n, as a value. Text the browser formats (relative time,
  numbers, dates) uses `Intl` (`Intl.RelativeTimeFormat`, `Intl.NumberFormat`) with the
  page's locale (`document.documentElement.lang`), never a library's built-in English.
- State lives in values (`static values = { open: Boolean }`) and is reacted to in
  `openValueChanged()`, not in instance properties, so Turbo Streams and morphs can
  change it and Turbo's cache keeps it. Only a transient handle a value should not hold
  (a library instance, a timer id) is a property.
- Listen with `data-action`, including global events (`resize@window->gallery#layout`).
  When a listener must be added in code, store the bound function once and remove that
  same reference in `disconnect()`.
- `connect()` only sets up: creates a library instance, checks a browser capability.
  `disconnect()` destroys what `connect()` created. A third-party library is always
  wrapped in a controller this way, never started from a global `turbo:load` listener.
- Controllers talk through a custom event (`this.dispatch("selected", { detail })`)
  first; through outlets when one must call another's method; never by finding another
  controller with `getControllerForElementAndIdentifier`.
- A new kind of widget is a subclass of a base controller that calls a `setup()` hook,
  not a new branch in a `switch` on a type value. A replaceable service is chosen by a
  value that names its adapter, not instantiated inline.
- A controller that changes the DOM for a transient effect defines `teardown()` to undo
  it; `application.js` calls every `teardown()` on `turbo:before-cache`, so the cached
  page shows the original state.
- Errors go through `this.handleError(error)` from the base controller, which forwards
  to `application.handleError`, patched once in `application.js` to reach the error
  tracker. No `console.error` in controllers.
- Forms: Stimulus decides when to submit (`this.element.requestSubmit()`); Turbo sends
  the request. A controller that must send the request itself calls
  `event.preventDefault()` first.

## Turbo

- A Turbo Frame wraps the part of the page it replaces, identified with
  `turbo_frame_tag dom_id(record)`; a frame around a collection with
  `dom_id(Article, :list)`, the same call in the frame and in every link or form that
  targets it, so the two cannot drift. The response contains the same frame; a link that
  should leave the frame uses `data: { turbo_frame: "_top" }`.
- A Turbo Stream response is a template (`create.turbo_stream.erb`) with actions
  targeting `dom_id`s, never HTML strings built in the controller.
- A broadcast to other browsers is sent by the service object after the transaction
  commits, never with `broadcasts_to` in the model, which is a callback. Use the `_later`
  form with the partial or component the page itself renders
  (`Turbo::StreamsChannel.broadcast_prepend_later_to(stream, target:, partial:, locals:)`),
  so a job renders it and the service builds no HTML.
- Name a stream by what its subscribers see (`[:articles, :public]`), and subscribe only
  the pages where every broadcast is right (the first page of an unfiltered,
  newest-first list).
- Confirm a destructive action with `data: { turbo_confirm: t(".confirm") }`, never a
  JavaScript `confirm()`.
- The status codes Turbo needs (422 on a failed form, 303 after a non-GET) are in
  `rails-controllers.md`.

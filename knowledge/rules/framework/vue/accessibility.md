---
paths:
  - "**/*.vue"
---

# Vue Accessibility

## Native elements first

- Actions are `<button type="button">` (or `type="submit"` in a form); navigation is a link (`<a href>` or `<RouterLink>`/`<NuxtLink>`). Never put `@click` on a `div`/`span` to make a control: it gets no keyboard access, no focus, and no role. If it truly cannot be a native element, it needs a `role`, `tabindex="0"`, and Enter/Space handlers (`@keydown.enter`, `@keydown.space.prevent`) — prefer the design system's component instead.
- A `<button>` inside a `<form>` defaults to `type="submit"`; give every non-submit button `type="button"`, or it submits the form.
- Use the semantic element for the job: lists as `ul`/`ol`, tabular data as `table` with `th`, headings in order (one `h1` per page, no skipped levels for styling), landmarks (`header`, `nav`, `main`, `footer`).
- No ARIA is better than wrong ARIA. Do not add a `role` a native element already has, and do not use `aria-*` to patch a `div` that should have been a `button`.

## Names & labels

- Every form control has a visible label tied to it: `<label :for="id">` with an `id` from `useId()` (Vue 3.5+) or a stable prop, or the control nested inside the `<label>`. A placeholder is not a label.
- Validation errors are linked to the field (`aria-describedby` pointing at the message, `aria-invalid` on the field).
- A wrapper component around an input (`BaseInput`) forwards `id`, `aria-*` and other attributes to the actual `<input>`, not to its root `<div>`: set `defineOptions({ inheritAttrs: false })` and bind `v-bind="$attrs"` on the input, the way existing wrappers do.
- Icon-only buttons and links have an accessible name (`aria-label`, or visually hidden text); the icon itself is `aria-hidden="true"`.
- Images: informative images get an `alt` that says what they convey; decorative ones get `alt=""`.
- Accessible names and visible text go through the project's i18n like any other text.

## Focus & keyboard

- Everything that can be done with a mouse can be done with a keyboard, in a logical tab order. Do not use a positive `tabindex`.
- Never remove the focus outline (`outline: none`) without a visible replacement; style `:focus-visible`.
- Dialogs, drawers and menus: use the design system's primitive, a headless library the project has (Reka UI/Radix Vue, Headless UI), or native `<dialog>`. It must move focus in on open, trap it, close on Escape, and return focus to the trigger. Rendering through `<Teleport to="body">` does not do any of that by itself.
- After an action that removes the focused element (deleting a row, closing a panel), move focus somewhere sensible instead of letting it fall to `<body>`.
- In a client-routed app, check how the project handles focus or announcements on route change, and follow it for new routes.

## Dynamic content

- Content that appears without a page load (toasts, async results, save status) is announced through a live region: `role="status"` for information, `role="alert"` for errors that need attention now. The region must be in the DOM before its text changes, so do not create it with the same `v-if` that sets the message.
- Loading states are perceivable: `aria-busy` on the region being loaded, or a status message, not only a spinner graphic.

## Visual

- Do not convey information with color alone.
- Use the design system's colors; do not invent new low-contrast greys.
- Respect `prefers-reduced-motion` for non-essential animation, including `<Transition>`.

## Checking

- If the project has `eslint-plugin-vuejs-accessibility`, its findings are errors to fix, not suppress.
- Querying by role or label in tests checks names and roles as a side effect: a control you cannot find that way is probably inaccessible.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

---
paths:
  - "**/*.jsx"
  - "**/*.tsx"
---

# React Accessibility

## Native elements first

- Actions are `<button type="button">` (or `type="submit"` in a form); navigation is a link (`<a href>` or the router's `Link`). Never put `onClick` on a `div`/`span` to make a control: it gets no keyboard access, no focus, and no role. If it truly cannot be a native element, it needs a `role`, `tabIndex={0}`, and Enter/Space key handling — prefer the design system's component instead.
- A `<button>` inside a `<form>` defaults to `type="submit"`; give every non-submit button `type="button"`, or it submits the form.
- Use the semantic element for the job: lists as `ul`/`ol`, tabular data as `table` with `th`, sections with headings in order (one `h1` per page, no skipped levels for styling), landmarks (`header`, `nav`, `main`, `footer`).
- No ARIA is better than wrong ARIA. Do not add a `role` a native element already has, and do not use `aria-*` to patch a `div` that should have been a `button`.

## Names & labels

- Every form control has a visible label tied to it: `<label htmlFor={id}>` with `id` from `useId`, or the control nested inside the `<label>`. A placeholder is not a label: it disappears on input and is often low-contrast.
- Validation errors are linked to the field (`aria-describedby` pointing at the message, `aria-invalid` on the field), so a screen reader announces them with the field.
- Icon-only buttons and links have an accessible name: `aria-label`, or visually hidden text. The icon itself is `aria-hidden`.
- Images: informative images get an `alt` that says what the image conveys; decorative ones get `alt=""` so they are skipped.
- Accessible names and visible text go through the project's i18n like any other text.

## Focus & keyboard

- Everything that can be done with a mouse can be done with a keyboard, in a logical tab order. Do not use a positive `tabIndex`.
- Never remove the focus outline (`outline: none`) without a visible replacement; style `:focus-visible`.
- Dialogs, drawers and menus: use the design system's primitive (or a headless library the project has, or native `<dialog>`), which moves focus in on open, traps it, closes on Escape, and returns focus to the trigger on close. Do not hand-roll these.
- After an action that removes the focused element (deleting a row, closing a panel), move focus somewhere sensible instead of letting it fall to `<body>`.
- In a client-routed app, check how the project handles focus or announcements on route change, and follow it for new routes.

## Dynamic content

- Content that appears without a page load (toasts, async results, inline save status) is announced through a live region: `role="status"` (polite) for information, `role="alert"` for errors that need attention now. The region must be in the DOM before its text changes.
- Loading states are perceivable: `aria-busy` on the region being loaded, or a status message, not only a spinner graphic.

## Visual

- Do not convey information with color alone (an error state also has text or an icon).
- Use the design system's colors, which should meet WCAG AA contrast; do not invent new low-contrast greys.
- Respect `prefers-reduced-motion` for non-essential animation.
- Text resizes: do not set fixed heights on text containers or font sizes in `px` where the project uses `rem`.

## Checking

- If the project has `eslint-plugin-jsx-a11y`, its findings are errors to fix, not suppress.
- Querying by role in tests (`getByRole` with a name) checks names and roles as a side effect: a control you cannot find by role is probably inaccessible.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

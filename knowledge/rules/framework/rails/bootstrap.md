---
paths:
  - "app/views/**/*"
  - "app/components/**/*"
  - "app/assets/stylesheets/**/*"
  - "app/javascript/**/*.js"
---

# Bootstrap

Applies only when `package.json` includes `bootstrap` or the `Gemfile` includes
`bootstrap`; otherwise ignore this file. One CSS framework per app: never Bootstrap
beside Tailwind.

- Use Bootstrap's components and utility classes before writing CSS. Custom CSS covers
  only what Bootstrap has no class for.
- Customise through Sass variables, never by overriding compiled rules or with
  `!important`. `app/assets/stylesheets/application.bootstrap.scss` imports in this
  order: `variables` (the overrides), Bootstrap, then one partial per component
  (`components/_card.scss`).
- Never edit Bootstrap's own files (`node_modules/bootstrap`, a vendored copy).
- Interactive components (dropdown, modal, collapse, tooltip) are driven by `data-bs-*`
  attributes. When a Stimulus controller needs one in code, it imports it
  (`import { Modal } from "bootstrap"`), creates it in `connect()` and calls `dispose()`
  in `disconnect()`.
- Keep the `aria-*` and `role` attributes Bootstrap's markup carries.
- `app/assets/builds/` is build output: never edit or commit it.

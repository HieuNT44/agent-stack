---
paths:
  - "app/views/**/*"
  - "app/components/**/*"
  - "app/helpers/**/*.rb"
  - "app/assets/tailwind/**/*"
  - "app/assets/stylesheets/**/*"
---

# Tailwind CSS

Applies only when the `Gemfile` includes `tailwindcss-rails` or `package.json` includes
`tailwindcss`; otherwise ignore this file. Tailwind builds CSS by scanning the source,
so it cannot be loaded through importmap; a page that loads it from the Play CDN is not
production-ready, say so.

- Style with utility classes in templates and components. No hand-written CSS for what
  a utility expresses.
- A class list repeated in several places becomes a component (or a partial), not an
  `@apply` rule. `@apply` only for markup the app does not render itself (rich text
  content, a third-party widget).
- Design tokens (colours, fonts, spacing) are declared once in `@theme` in the Tailwind
  entry file (`app/assets/tailwind/application.css` with `tailwindcss-rails`,
  `app/assets/stylesheets/application.tailwind.css` with cssbundling-rails; on Tailwind
  v3, `tailwind.config.js`) and used by name (`bg-brand-500`). No arbitrary values like
  `bg-[#1e40af]` for a colour the design uses twice.
- Write every class name in full in the source. A name built by interpolation
  (`"bg-#{color}-500"`) is never generated; map each variant to its full class list:
  ```ruby
  VARIANTS = { primary: "bg-brand-600 text-white", danger: "bg-red-600 text-white" }.freeze
  ```
- Responsive and state variants use prefixes (`md:`, `hover:`, `dark:`), not media
  queries in CSS.
- `app/assets/builds/` is build output: never edit or commit it. `bin/dev` runs the
  watcher.

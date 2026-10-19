---
paths:
  - "**/*.vue"
  - "**/*.js"
  - "**/*.ts"
  - ".env.example"
---

# Vue Security

## The browser is public

- Everything in the client bundle is readable by anyone: code, constants, and every environment variable the bundler inlines. `VITE_` variables (Vite, or the prefixes set in `envPrefix`, plus anything `define` inlines), `VUE_APP_` variables (Vue CLI) and Nuxt's `runtimeConfig.public` (`NUXT_PUBLIC_…`) are shipped to the browser. Never put a secret there.
- In Nuxt, secrets go in the private part of `runtimeConfig` and are read only in server code (`server/`, server-only plugins).
- A check in the UI (hiding a button, a route guard) is a convenience, not authorization. The API must enforce every permission; never rely on the client to keep data from a user who should not see it.
- A new environment variable gets a matching entry, with a dummy value, in `.env.example`.

## Rendering untrusted content

- Vue escapes `{{ }}` interpolation and bound attributes; keep it that way. `v-html` (and `innerHTML` in render functions) only with HTML sanitized by the project's sanitizer (e.g. DOMPurify) right where it is rendered, never with user or API content as-is. The same applies to Markdown rendered to HTML.
- URLs from users or external data bound to `href`, `src` or `action`: allow only expected schemes (`https:`, `http:`, `mailto:`, `tel:`, or a relative path). Vue does not block `javascript:` URLs.
- Never bind an untrusted object wholesale (`v-bind="apiData"`): it can set `innerHTML`, event handlers or `href`. Bind the fields you render.
- User content never reaches a template string compiled at runtime (in-DOM templates, `template:` options built from data); that is code execution.
- `window.postMessage` listeners check `event.origin` against an allowlist and validate `event.data`; senders pass an explicit target origin, never `'*'` for sensitive data.
- `target="_blank"` links to external or user-supplied URLs carry `rel="noopener noreferrer"`.

## Tokens & sessions

- Follow the project's existing auth: if it uses `httpOnly` cookies, do not start storing tokens in `localStorage` (readable by any injected script), and do not persist a token in a Pinia store with a persistence plugin.
- Never log tokens, passwords or personal data, and never put them in a URL.
- On logout, reset what the client keeps for the user: stores (`store.$reset()` for option stores, or an explicit reset action), cached queries, and user-specific storage keys.

## Server code in Nuxt

- Nuxt server routes (`server/api/`, `server/routes/`) are public HTTP endpoints. Each one authenticates, authorizes the current user for the specific record, and validates its input (`readValidatedBody`/`getValidatedQuery`, or the project's validator), even if the only caller is your own page.
- Return only the fields the client needs: the payload of `useFetch`/`useAsyncData` is serialized into the page source.

## Dependencies & third parties

- Ask before adding a third-party script, analytics tag, or SDK that runs in the page: it runs with full access to the user's session.
- Do not add a dependency to save a few lines; each one is code that runs in every user's browser.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

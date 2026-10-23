---
paths:
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.tsx"
  - ".env.example"
---

# React Security

## The browser is public

- Everything in the client bundle is readable by anyone: code, constants, and every environment variable the bundler inlines. Never put a secret in a variable that reaches the browser:

  | Setup | Shipped to the browser | Available only on the server |
  |---|---|---|
  | Vite | `VITE_*`, or the prefixes set in `envPrefix`, plus anything `define` inlines (and `MODE`, `BASE_URL`, `DEV`, `PROD`, `SSR`) | — a Vite SPA has no server; other variables are not in client code at all |
  | Next.js | `NEXT_PUBLIC_*` | Every other variable, in Server Components, Server Actions and route handlers |
  | Create React App | `REACT_APP_*`, `NODE_ENV`, `PUBLIC_URL` | — |
  | React Router / Remix framework mode | Whatever a `loader` returns | `process.env` inside `loader`/`action` |

- Secrets (API keys with write access, signing keys, database URLs) live only in server code. In Next.js, a module that reads them starts with `import 'server-only'` so importing it from a Client Component fails the build.
- A check in the UI (hiding a button, guarding a route) is a convenience, not authorization. The API must enforce every permission; never rely on the client to keep data from a user who should not see it.
- A new environment variable gets a matching entry, with a dummy value, in `.env.example`.
- Do not turn on publicly served production source maps (Vite `build.sourcemap: true`, Next.js `productionBrowserSourceMaps`): they publish the original source. If error tracking needs them, generate hidden maps (`'hidden'` in Vite) and upload them to the tracker, the way the project already does.

## Rendering untrusted content

- React escapes text in `{}`; keep it that way. Prefer rendering user content as text, or through a Markdown renderer that does not pass raw HTML through.
- `dangerouslySetInnerHTML` only with HTML sanitized by the project's sanitizer (e.g. DOMPurify) **at the same call site**, configured with an allowlist of tags and attributes. Sanitizing somewhere upstream does not count: the next caller of the same data will not know it must be clean.
- Third-party components that accept an HTML string (rich-text viewers, some tooltip and table libraries) are `dangerouslySetInnerHTML` under another name; apply the same rule.
- URLs from users or external data placed in `href`, `src`, `action` or `formAction`: allow only expected schemes. React 19 replaces a `javascript:` URL with one that throws when followed; React 18 and earlier only warn in development. Neither covers other schemes, or URLs you pass to `window.location`, `window.open` or a router. Validate by parsing the URL with the `URL` constructor (against a dummy base, so relative paths resolve) and allowing only `http:`, `https:`, `mailto:` and `tel:`; reject a string that does not parse. Compare the parsed `protocol`, never a string prefix: browsers ignore case and strip tabs and newlines inside a scheme.
- Never spread an untrusted object into props (`<div {...apiData} />`): it can set `dangerouslySetInnerHTML`, event handlers or `href`. Pick the fields you render.
- Do not deep-merge untrusted JSON into existing objects with a hand-written or outdated merge helper: a `__proto__` key in the input can pollute every object's prototype. Parse it with the project's schema and copy the known fields.
- Do not build HTML strings, `eval`, `new Function`, or `setTimeout` with a string argument.
- `window.postMessage` listeners check `event.origin` against an allowlist and validate `event.data` before using it; senders pass an explicit target origin, never `'*'` for sensitive data.
- `target="_blank"` links to external or user-supplied URLs carry `rel="noopener noreferrer"`.

## Tokens & sessions

- Follow the project's existing auth: if it uses `httpOnly` cookies, do not start storing tokens in `localStorage` (readable by any injected script). If it already stores tokens client-side, do not add a second place; if you are designing auth from scratch, use `httpOnly` cookies.
- With cookie-based auth, state-changing requests need CSRF protection. Keep the project's mechanism (`SameSite` cookies, a CSRF token the API client sends, the framework's built-in origin check); never remove it to make a failing request pass.
- Never log tokens, passwords or personal data, and never put them in a URL (query strings end up in history, logs and `Referer`).
- On logout, clear what the client cached for the user: the query cache, persisted stores, and user-specific storage keys.

## Server code in React frameworks

- Next.js Server Actions and route handlers, and React Router/Remix `action`/`loader` functions, are public HTTP endpoints. Each one authenticates, authorizes the current user for the specific record, and validates its input on the server, even if the only caller is your own form.
- Rate-limit the sensitive ones (sign-in, password reset, sending mail or SMS, payments) per account and per IP, with the project's limiter.
- Return only the fields the client needs from server code; a full record passed to a Client Component ends up in the page source.
- In a hand-built SSR setup, values you put into the HTML around React's output are not escaped for you. Data embedded in a `<script>` tag must have `<` escaped (`JSON.stringify(data).replace(/</g, '\\u003c')`), or a `</script>` inside the data ends the tag and runs what follows. Frameworks do this already.

## Dependencies & third parties

- Ask before adding a third-party script, analytics tag, or SDK that runs in the page: it runs with full access to the user's session.
- Do not add a dependency to save a few lines; each one is code that runs in every user's browser.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

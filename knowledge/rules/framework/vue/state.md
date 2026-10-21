---
paths:
  - "**/*.vue"
  - "**/*.js"
  - "**/*.ts"
---

# Vue State & Data Fetching

## Where state lives

Put each piece of state in the first place on this list that fits, and use the tool the project already has for it:

| State | Where |
|---|---|
| Used by one component | `ref` in that component |
| Shared by a parent and its children | Props down, events up; `provide`/`inject` for a deep subtree |
| Should survive a reload or be shareable (filters, sort, page, selected tab) | The URL, through the router's query |
| Comes from the server | The project's data-fetching layer (below) |
| Client-only, read across the app | A Pinia store (or the project's existing store) |

Do not add a new state library, or a second one doing the same job, without approval. Pinia is Vue's official store; Vuex is in maintenance — in a Vuex project, keep using Vuex unless a migration is asked for.

## Server data

- Fetch through the project's mechanism: Nuxt's `useFetch`/`useAsyncData`, TanStack Vue Query, Pinia Colada, a store action, or a composable around the API client. Read the nearest feature that loads data and follow it.
- In an Inertia app, a page's data comes as props from its controller: add the prop there instead of fetching from the page, refresh it with `router.reload({ only: ['orders'] })`, and let the redirect after a form submission bring back fresh props.
- Call the API through the project's client (an `axios` instance, a `$fetch`/`ofetch` wrapper, a generated SDK), which owns the base URL, auth headers and error mapping. Do not call `fetch` with a hard-coded host.
- Do not keep a second copy of server data in a store "to cache it" when the fetching layer already caches it: the copy goes stale.
- After a mutation, update or refetch everything that shows the changed data; otherwise the UI keeps showing the old value.
- Render all four states of every request: loading, error (with a retry where it makes sense), empty, and data.
- Fetching in a component without a library: watch the inputs with `{ immediate: true }`, and abort the previous request in the watcher's cleanup (`onCleanup`, or `onWatcherCleanup()` on 3.5+) by passing an `AbortController`'s `signal` to the request, so an older response cannot overwrite a newer one. An aborted request rejects: do not show that rejection as an error, and do not let it clear the newer request's loading state.
- `fetch` resolves on 4xx/5xx; check `response.ok` before reading the body as data.

### If the project uses Nuxt

- In `setup`, load data with `useFetch` or `useAsyncData`, so it is fetched once on the server and reused on the client. Calling `$fetch` directly in `setup` fetches twice (server and client) and causes hydration mismatches.
- Use `$fetch` in event handlers and other client-only code.
- `useAsyncData` needs a key unique to the data (`` `order-${id}` ``); a reused key returns another call's data. Make the request reactive to its inputs (pass refs/getters in the URL or options, or `watch`) instead of refetching by hand.
- State shared across components and between server and client: `useState('key', () => init)`, or Pinia — never a module-level `ref`.

### If the project uses TanStack Vue Query

- The query key contains every variable the query function uses, as refs or getters so it updates (`queryKey: ['orders', status]` with `status` a ref).
- After a mutation, `queryClient.invalidateQueries({ queryKey: [...] })`, or `setQueryData` when the response holds the updated entity.

## Mutations & user actions

- Disable the trigger, or ignore repeat calls, while a submission is pending; a double click must not create two records.
- Optimistic updates keep the previous value and roll it back on error.
- Show the outcome of every action: success feedback, or an error the user can act on. Never swallow a rejected promise.

## Pinia

- Follow the store style the project uses: option stores (`state`/`getters`/`actions`) or setup stores (refs, computeds, functions). In a setup store, return every piece of state, or SSR, DevTools and plugins miss it.
- Destructure state and getters with `storeToRefs(store)`; plain destructuring copies the values once and loses reactivity. Actions can be destructured directly.
- Call `useXStore()` inside `setup`, a composable, an action, or a route guard — not at the top level of a module, where it runs before Pinia is installed (and, under SSR, shares one store across requests).
- Change state through actions when the logic is more than a one-line assignment, so it has one place to change and test.
- Keep in a store only what is truly global client state (session, cross-page selections, a cart); not form inputs and not state one screen uses.

## Router

An Inertia app has no Vue Router: routes are defined on the server, and a page gets its data as props. Navigate with `<Link>` or `router.visit()`, and skip the rest of this section.

- When only the params change (`/orders/1` → `/orders/2`), Vue Router reuses the component: `setup` and `onMounted` do not run again. React to `() => route.params.id` with a watcher, or key the `<RouterView>`.
- Navigate by route name with params (`router.push({ name: 'order', params: { id } })`), not by building path strings.
- Navigation guards return a value (`false`, a route location, or nothing) instead of calling `next()` in new code.

## Browser storage

- `localStorage`/`sessionStorage` can throw (private mode, quota, disabled storage) and does not exist on the server. Read inside a `try` with a default, parse with validation, and version the key when its shape changes; or use the project's helper (`useLocalStorage` from VueUse, a Pinia persistence plugin).

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

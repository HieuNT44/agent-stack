---
paths:
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.tsx"
---

# React State & Data Fetching

## Where state lives

Put each piece of state in the first place on this list that fits, and use the tool the project already has for it:

| State | Where |
|---|---|
| Used by one component | `useState`/`useReducer` in that component |
| Shared by a few nearby components | Lifted to their closest common parent |
| Should survive a reload or be shareable (filters, sort, page, selected tab) | The URL, through the router's search params |
| Comes from the server | The project's server-state layer (below), never copied into local or global state |
| Client-only, read across the app | The project's store or context |

Do not add a new state library, or a second one doing the same job, without approval.

## Server data

- Fetch through the project's mechanism: TanStack Query, SWR, RTK Query, Apollo, router loaders (React Router/Remix), or Server Components (Next.js App Router). Read the nearest feature that loads data and follow it: where queries live, how keys are built, how the API is called.
- Call the API through the project's client (an `axios` instance, a `fetch` wrapper, a generated SDK), which owns the base URL, auth headers and error mapping. Do not call `fetch` with a hard-coded host.
- Do not copy fetched data into `useState` or a global store to "keep" it: you get two sources of truth and the copy goes stale. Read it from the cache; keep only the user's edits in local state.
- After a mutation, update or invalidate every cached query that shows the changed data; otherwise the UI keeps showing the old value.
- Render all four states of every request: loading, error (with a retry where it makes sense), empty, and data. An error that leaves a spinner forever, or an empty list that looks like a broken page, is a bug.

### If the project uses TanStack Query

- The query key contains every variable the query function uses (`['orders', { status, page }]`). A variable missing from the key serves one filter's data for another.
- v5 accepts only the object form, `useQuery({ queryKey, queryFn })`. The `loading` status became `pending` (`isPending`); `isLoading` still exists but now means "pending and fetching", and `cacheTime` became `gcTime`. Check the installed major before copying an example.
- Mutations: `useMutation` with `onSuccess` → `queryClient.invalidateQueries({ queryKey: [...] })`, or `setQueryData` when the response holds the updated entity.
- Do not set `staleTime: Infinity` or turn off refetching globally to fix a symptom; set it per query with a reason.

### Fetching in an effect

Only when the project has no data-fetching library, and only on the client:

- Guard against out-of-order responses: when the input changes quickly (typing, paging), an older response can arrive last and overwrite the newer one. Cancel or ignore it in the cleanup:
  ```tsx
  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(status, { signal: controller.signal })
      .then(setOrders)
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error);
      });
    return () => controller.abort();
  }, [status]);
  ```
- `fetch` resolves on 4xx/5xx; check `response.ok` before reading the body as data.
- If the same fetch is needed in a second place, propose a data-fetching library instead of growing a hand-rolled cache.

## Mutations & user actions

- Disable the trigger, or ignore repeat calls, while a submission is pending; a double click must not create two records.
- Optimistic updates keep the previous value and roll it back on error, then refetch to settle on the server's truth.
- Show the outcome of every action: success feedback, or an error the user can act on. Never swallow a rejected promise; an unhandled rejection in an event handler fails silently in production.

## Global stores

- Redux Toolkit, if the project uses it: write slices with `createSlice` (Immer lets reducers "mutate" the draft there, and only there); read with typed `useAppSelector`/`useAppDispatch` hooks if the project defines them. Do not hand-write action types or spread-heavy reducers.
- Zustand and similar stores, if the project uses one: select the smallest slice a component needs (`useCartStore((s) => s.count)`), not the whole store, or the component re-renders on every change. A selector returning a new object or array each call needs the library's shallow comparison helper.
- Keep in a store only what is truly global client state (session UI, cross-page selections, a cart before checkout); not server data, not form inputs, not state one screen uses.

## Browser storage

- `localStorage`/`sessionStorage` can throw (private mode, quota, disabled storage) and does not exist on the server. Read inside a `try` with a default, parse with validation, and version the key when its shape changes.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

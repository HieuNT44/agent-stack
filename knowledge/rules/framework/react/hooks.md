---
paths:
  - "**/*.jsx"
  - "**/*.tsx"
  - "**/use[A-Z]*.{js,ts}"
  - "**/use-*.{js,ts}"
  - "**/hooks/**"
---

# React Hooks & Effects

## Rules of hooks

- Call hooks at the top level of a component or a custom hook only: never inside conditions, loops, nested functions, or after an early `return`. React matches state to hooks by call order, so a hook skipped on one render hands every later hook the wrong state. (`use()` is the one exception: it may be called conditionally.)
- Call hooks only from components and from functions whose name starts with `use`.

## Local state

- Keep the minimum state. Anything computable from props or other state is computed during render, not stored and kept in sync with an effect: that costs an extra render, and a moment where the two disagree.
- Do not copy a prop into state, except as an explicitly named initial value (`initialCount`). To reset a component's state when an identity changes, give it a `key` (`<Profile key={userId} />`).
- Store IDs, not copies of objects that also live in a list (`selectedId`, not `selectedItem`), so the selection cannot go stale when the list updates.
- Update state immutably: new objects/arrays (`[...items, item]`, `items.map(...)`, `{ ...user, name }`), never `push`, `splice` or property assignment on the current value. React compares by reference and skips the update otherwise.
- When the next value depends on the previous one, use an updater: `setCount((c) => c + 1)`. State is a snapshot: after `setX(…)`, `x` still holds the old value until the next render.
- An expensive initial value goes in an initializer function, `useState(() => parseFilters(search))`; `useState(parseFilters(search))` recomputes it on every render and throws the result away.
- Split unrelated values into separate `useState` calls; group values into one object only when they always change together. Switch to `useReducer` when one event updates several related values, or the next state depends on the previous one in several ways: the transitions then live in one function that can be tested on its own.

## Effects

- An effect is for synchronizing with something outside React (a subscription, a timer, a browser API, a non-React widget, a network connection). Before writing one, check that the job is not:
  - deriving a value for render → compute it during render;
  - responding to a user action → do it in the event handler, where you know what happened;
  - notifying a parent of a change → call its callback in the same event handler that changed the state;
  - resetting state when a prop changes → use a `key`;
  - fetching data → use the project's data-fetching approach (a query library, router loaders, Server Components).
- Every effect that subscribes, listens, starts a timer or opens a connection returns a cleanup that undoes it.
- Development `StrictMode` runs every effect, then its cleanup, then the effect again, on purpose. A request sent twice or a listener added twice in development means a cleanup is missing; fix the effect, never remove `StrictMode`.
- List every reactive value the effect reads in its dependency array; the array describes the code, it is not a switch for when to run. If the effect runs too often, change the code: move the object or function it needs inside the effect, depend on a primitive (`user.id`, not `user`), or read the latest value without reacting to it with `useEffectEvent` (React 19.2+).
- Objects, arrays and functions created during render are new on every render; used as a dependency, they re-run the effect every time.
- An effect whose dependency list keeps growing is doing several jobs. Split it into one effect per external system.

## Stale closures

A function created during a render sees that render's props and state, forever. Callbacks that outlive the render — intervals, timeouts, subscriptions, `await` continuations — read old values. An interval started in a mount-only effect that calls `setCount(count + 1)` keeps setting the first render's value plus one.

Fix a stale read with, in order of preference: an updater function; the value in the dependency array (the effect re-subscribes with fresh values); `useEffectEvent` (React 19.2+); or, as a last resort, a ref kept in sync with the latest value.

## Refs

- Use a ref for values that must survive renders without causing one (timer IDs, the previous value, DOM nodes). Read and write `ref.current` in effects and event handlers, not during render.
- Reach for the DOM through refs only for what React cannot express (focus, scroll, measuring, third-party widgets). Do not toggle classes or content through the DOM.
- `useImperativeHandle` only when a parent genuinely needs to call a method on a child (`focus()`, `scrollToRow()`); prefer props for everything else.

## Custom hooks

- Extract a custom hook when the same combination of state and effects appears in two or more components, or to give a self-contained effect a name that says what it does (`useOnlineStatus`, `useDebouncedValue`).
- Do not wrap a single `useState` in a hook just to rename it; that adds a file and hides nothing.
- A custom hook shares stateful logic, not state: two components calling `useCart()` each get their own state. Share state by lifting it up, through context, or through the project's store.
- Name hooks after what they provide, and return what callers need: a value, a tuple like `useState`, or an object when there are more than two things.

## External stores

Subscribe to anything outside React that changes over time (browser APIs, a non-React store, an event emitter) with `useSyncExternalStore`, not an effect plus `useState`; it stays consistent under concurrent rendering. Declare `subscribe` outside the component: a function created inline is new on every render, so React unsubscribes and resubscribes each time. When the app renders on the server, also pass `getServerSnapshot`, the value used during server rendering.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

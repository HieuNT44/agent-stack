---
paths:
  - "**/*.jsx"
  - "**/*.tsx"
---

# React Components

## Order of precedence

1. `AGENTS.md` and the **Project-specific** section at the end of each rule file in `.claude/rules/react-*.md`.
2. Patterns already in the code: before creating a component, read the 2–3 nearest files of the same kind and follow them (folder, file naming, props typing, styling, how data reaches the component).
3. The general rules in `.claude/rules/react-*.md`.

Do not convert existing code to the style of these rules unless explicitly asked. Do not mix two styles for the same job.

## Building blocks

- Use the project's design system / component library (its `Button`, `Dialog`, `Input`…) before writing a new primitive. Do not introduce a second styling approach, state library or component library the project does not already use.
- New components are function components. The one place a class is still needed is an error boundary, unless the project uses `react-error-boundary` or the framework's own boundary.

## Rendering is pure

- A component returns JSX computed from its props, state and context, and does nothing else during render: no fetching, no subscriptions, no writing to variables outside the component, no mutating props or state, no reading or writing `ref.current`.
- Never declare a component inside another component's body. It is a new type on every render, so React unmounts and remounts it, losing its state and focus. Declare it at module level and pass what it needs as props.
- Call `React.lazy()` at module level, not inside a component, for the same reason.

## JSX

- Keys come from the data (`item.id`): stable and unique among siblings. Use the array index only for a static list that never reorders, inserts or deletes; with index keys, a reordered list attaches each row's state to the wrong item. Never `Math.random()` or `crypto.randomUUID()` at render time.
- `{count && <Badge />}` renders `0` when `count` is `0`. Make the left side a boolean: `{count > 0 && <Badge />}`.
- Pass handlers, do not call them: `onClick={handleSave}` or `onClick={() => remove(id)}`, never `onClick={handleSave()}`.
- An input is either controlled (`value` + `onChange`) or uncontrolled (`defaultValue` + a ref/form data) for its whole life. A controlled `value` must never be `undefined`/`null`: use `value={name ?? ''}`.
- Use a fragment (`<>…</>`) rather than a wrapper `div` when no element is needed; extra `div`s break flex/grid layouts and list semantics.
- Move a condition that spans several lines out of the JSX into a variable or an early return; no nested ternaries.
- `aria-*` and `data-*` attributes stay kebab-case; every other DOM attribute is camelCase (`htmlFor`, `className`, `tabIndex`).

## Exposing a DOM node

React 19+ takes `ref` as a regular prop; React 18 and earlier need `forwardRef`. Follow what the existing components do.

```tsx
// React 19+
import type { ComponentProps } from 'react';

type InputProps = ComponentProps<'input'>;

export function TextInput({ ref, ...rest }: InputProps) {
  return <input ref={ref} {...rest} />;
}
```

## Composition & context

- Pass children and props; prefer composition (`children`, slot props) to a growing list of configuration props.
- For a set of related controls (tabs, accordion, menu), follow the design system's compound pattern (`<Tabs.List>`, `<Tabs.Trigger>`) rather than one component with an array of item configs.
- Context is for values many components at different depths read and that change rarely (theme, locale, current user). Every consumer re-renders when the value changes, so a provider value built inline (`value={{ user, setUser }}`) re-renders them all on every parent render: memoize it, or split state and setters into separate contexts — unless the React Compiler is enabled. Frequently changing shared state belongs in the project's store, not context.
- Render modals, popovers and toasts that must escape a parent's `overflow` or stacking context through the design system's portal, or `createPortal(…, document.body)`.

## Performance

- Do not add `useMemo`, `useCallback` or `memo` by default. Add one when a measured render is slow, when the value is a dependency of an effect, or when it is passed to a `memo` child that would otherwise re-render. With the React Compiler enabled (`babel-plugin-react-compiler`, or `reactCompiler` in the Next.js config), add none: it memoizes for you.
- Fix the cause before memoizing: move state down to the component that uses it, or pass expensive subtrees as `children` so they do not re-render with the parent.
- Render long lists (hundreds of rows or more) with the project's virtualization library if it has one; otherwise paginate.
- Split rarely visited routes and heavy, rarely shown components (editors, charts, maps) with `React.lazy` + `Suspense`, or the framework's equivalent (`next/dynamic`).

## Errors & loading boundaries

- Wrap risky subtrees (a widget with third-party data, each route) in an error boundary, the way the project already does it (`react-error-boundary`, the framework's `error.tsx`/`ErrorBoundary` route export, or a class component). Error boundaries do not catch errors in event handlers, timers or async code: handle those where they happen.
- Put an error boundary above every `Suspense` boundary that waits for data. Without one, a failed load takes down everything up to the nearest boundary higher up, or the whole app.
  ```tsx
  <ErrorBoundary fallback={<OrderError />}>
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetails id={id} />
    </Suspense>
  </ErrorBoundary>
  ```
- A `Suspense` fallback replaces the whole subtree below it. Place boundaries close to the data that suspends, and use several narrow ones so content already loaded stays on screen.

## Server rendering

These apply only when the app is rendered on the server (Next.js, Remix/React Router framework mode, any SSR setup).

- Server and client must render the same first HTML. Do not render values that differ between them (`window`, `localStorage`, `Date.now()`, `Math.random()`, the user's locale or time zone) during render; read them in an effect, or render them only on the client. Generate element IDs with `useId`, not a counter or random value.
- Do not access `window`/`document` at module top level in a file the server imports.
- Next.js App Router: keep `'use client'` as far down the tree as possible, on the interactive leaf, not on a page or layout. The directive goes at the very top of the file, before any import.
- Props passed from a Server to a Client Component must be serializable (no functions except Server Actions, no class instances).
- A file imported by a Client Component becomes client code, with everything it imports. Pass server-rendered content into a Client Component as `children` instead of importing it there:
  ```tsx
  // app/orders/page.tsx — a Server Component
  export default async function OrdersPage() {
    const orders = await getOrders();
    return (
      <FilterPanel>
        <OrderTable orders={orders} />
      </FilterPanel>
    );
  }
  ```
  ```tsx
  // app/orders/FilterPanel.tsx
  'use client';

  import { useState, type ReactNode } from 'react';

  export function FilterPanel({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
      <section>
        <button type="button" onClick={() => setOpen((o) => !o)}>
          Filters
        </button>
        {open && <Filters />}
        {children}
      </section>
    );
  }
  ```
  `OrderTable` stays a Server Component because `FilterPanel` receives it rendered, and never imports it.

## Styling

- Use the project's styling approach (CSS Modules, Tailwind, CSS-in-JS…) and its design tokens; do not add inline `style` for what the system already expresses.
- Tailwind only ships class names it finds as complete strings in the source. Never build one by interpolation (`` `bg-${color}-500` ``); map values to full class names (`{ danger: 'bg-red-500', … }[tone]`).

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

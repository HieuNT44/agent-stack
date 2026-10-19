---
paths:
  - "**/*.vue"
---

# Vue Components & Reactivity

## Order of precedence

1. `AGENTS.md` and the **Project-specific** section at the end of each rule file in `.claude/rules/vue-*.md`.
2. Patterns already in the code: before creating a component, read the 2–3 nearest files of the same kind and follow them (folder, file naming, `<script setup>` or Options API, props typing, styling, how data reaches the component).
3. The general rules in `.claude/rules/vue-*.md`.

Do not convert existing code to the style of these rules unless explicitly asked. Do not mix two styles for the same job.

## Building blocks

- Use the project's component library / design system (its `BaseButton`, dialog, inputs…) before writing a new primitive. Do not introduce a second styling approach, state library or component library the project does not already use.

## Reactivity

- Prefer `ref()` for state; use `reactive()` only for an object you never reassign or destructure, the way the project does. Reassigning a `reactive` variable, or destructuring it (`const { count } = state`), disconnects you from reactivity; use `toRefs(state)` when you must destructure.
- `.value` is needed in script and unwrapped in templates only for top-level refs. A ref nested in a plain object (`{ total: ref(0) }`) is not unwrapped inside an expression (`{{ obj.total + 1 }}`); destructure it to the top level (`const { total } = obj`) rather than adding `.value`.
- Derive values with `computed(() => …)`, never with a `ref` that a `watch` keeps in sync: that is a second source of truth, and it updates one tick late.
- A `computed` getter returns a value and does nothing else: no mutations, no requests, no DOM access. Do not mutate the value it returns.
- Large data you replace wholesale (an API response list, a chart dataset) can be a `shallowRef`, so Vue does not deep-proxy every nested object. Third-party instances (map, editor, chart objects) are wrapped in `markRaw` or kept in a `shallowRef`; a deep proxy breaks many of them.

## Props & events

- Props flow down and are read-only. Never assign to a prop or to a property of an object prop; emit an event and let the owner change it, or use `v-model` (`defineModel()` on Vue 3.4+, a `modelValue` prop plus `update:modelValue` emit before).
- To start from a prop's value and then diverge, copy it into a local ref named for the purpose (`const draft = ref(props.initialValue)`); to transform it, use a `computed`.
- Before Vue 3.5, destructuring `defineProps()` loses reactivity: read `props.x`, or `toRefs(props)`. From 3.5 destructured props are reactive in `<script setup>`, but passing one to a function still passes its current value: pass a getter (`() => count`) to a composable or `watch`.
- Declare every emitted event with `defineEmits` (or `emits`), typed. Undeclared listeners fall through as native listeners on the root element.
- Pass the smallest data a child needs, not whole stores. Deep chains of props are a sign to use `provide`/`inject` or a store.

## Watchers

- Use a watcher only for side effects in response to a change (a request, `localStorage`, a non-Vue library), not to compute a value.
- Watch a reactive property through a getter: `watch(() => props.id, …)` or `watch(() => state.count, …)`. `watch(props.id, …)` watches a plain value and never fires.
- Watching a `reactive` object directly is deep; watching a getter that returns an object is not, unless you pass `{ deep: true }`. Prefer watching the specific property you need.
- Cancel stale work in the cleanup: the `onCleanup` argument of the callback, or `onWatcherCleanup()` on Vue 3.5+. Without it, a slow earlier request can overwrite a newer result.
- Watchers created synchronously in `setup` stop with the component, and so do those created after a top-level `await` in `<script setup>` (the compiler restores the instance). A watcher created after an `await` in a plain `setup()` function, or inside a callback (`setTimeout`, a promise's `.then`), does not: keep the returned stop function and call it on unmount.

## Lifecycle & DOM

- Touch the DOM only in `onMounted` or later, through template refs (`ref="input"` + a same-named `ref(null)`, or `useTemplateRef('input')` on Vue 3.5+). Do not query the document for elements the component renders.
- After changing state, the DOM updates asynchronously: `await nextTick()` before reading it.
- Everything a component starts — event listeners on `window`/`document`, timers, intervals, observers, sockets — is stopped in `onUnmounted` (or use the VueUse helper the project has, which cleans up for you).

## Templates

- `v-for` always has a `:key` from the data (`item.id`): stable and unique among siblings. The index is acceptable only for a static list that never reorders, inserts or deletes.
- Never put `v-if` and `v-for` on the same element: in Vue 3 `v-if` is evaluated first and cannot see the loop variable. Filter in a `computed`, or put `v-for` on a wrapping `<template>`.
- `v-if` for content that rarely toggles or is expensive; `v-show` for content toggled often.
- Name event handlers by intent (`@click="removeItem(item.id)"`), and keep inline handlers to a single call.
- `v-html` only with HTML sanitized by the project's sanitizer; never with user or API content as-is.

## Composition & sharing

- Share stateful logic through composables that accept refs or getters (normalize with `toValue()` on 3.3+) and return refs, so callers can destructure the result. A composable called in two components gives each its own state; module-level state in a composable is shared app-wide and, under SSR, across requests.
- `provide`/`inject` for values a subtree reads at different depths (form context, theme). Provide a `readonly()` ref plus explicit update functions, so descendants cannot mutate it behind the provider's back.
- Slots for content the parent decides; prefer them to a growing list of configuration props.

## Performance

- Lazy-load route components (`component: () => import('./OrderPage.vue')`) and heavy, rarely shown components with `defineAsyncComponent`.
- Render long lists (hundreds of rows or more) with the project's virtual-list component if it has one; otherwise paginate.
- Keep expensive work out of templates: a method called in a template runs on every re-render; a `computed` is cached.

## Errors

- Handle errors from async work where it happens (show an error state, report it). `onErrorCaptured` in a parent and `app.config.errorHandler` catch what escapes; follow how the project reports errors.

## Server rendering

These apply only when the app renders on the server (Nuxt, or a custom SSR setup).

- `onMounted`/`onUnmounted` do not run on the server; `setup` does. Do not access `window`, `document` or `localStorage` in `setup` or at module top level; do it in `onMounted`, or behind `import.meta.client` (Nuxt).
- Server and client must render the same first HTML: do not render `Date.now()`, random values, or the user's locale/time zone directly. Generate element IDs with `useId()` (Vue 3.5+, or Nuxt's `useId`).
- Never keep per-user state in a module-level `ref` or a store created outside the app: on the server it is shared by every request. In Nuxt, use `useState` or a Pinia store.

## Styling

- Use the project's approach (`<style scoped>`, CSS Modules with `<style module>`, Tailwind, a UI library's tokens). With `scoped`, style child components' internals with `:deep()`, sparingly.
- Tailwind only ships class names it finds as complete strings in the source. Never build one by interpolation (`` `bg-${color}-500` ``); map values to full class names.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

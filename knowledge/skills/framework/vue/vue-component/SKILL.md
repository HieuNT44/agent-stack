---
name: vue-component
description: Add or change a Vue or Nuxt component, page or view end to end, following the existing codebase's own patterns - placement, props and emits, data loading, loading/error/empty states, routing, tests. Use when asked to add, build or change a Vue component, page, screen, view or widget in an existing project.
---

# Vue Component

The procedure for adding or changing one component or page. The conventions live in `.claude/rules/vue-*.md`; they are not repeated here. This skill is the order of work.

## Step 0: Read the context (mandatory, before writing code)

1. Read `AGENTS.md` and the `.claude/rules/vue-*.md` files, especially each file's **Project-specific** section. Where they and the existing code disagree with this skill, they win.
2. Establish:
   - What runs the app (Nuxt, Vite SPA, Vue CLI, or Inertia inside Laravel), the Vue version, and whether components use `<script setup>` or the Options API.
   - Whether the component is **new** or an **existing** one being changed. If existing, read it, its parents (`grep` for its name and its kebab-case tag) and its tests first.
   - Where its data comes from (props, the project's data-fetching layer, a Pinia store, the route) and who may see it (permissions).
3. Find the 1–2 nearest components of the same kind (a page, a list, a card, a form…). Note and follow:
   - folder and file naming, props/emits declaration style, the order of code in `<script setup>`
   - design-system components and styling (`scoped`, CSS Modules, Tailwind)
   - how they load data, and how they render loading, error and empty states
   - where their tests live and which mount helper they use
4. If the request lacks something that decides behaviour (what to show when empty, who may act, what happens on error, the design), ask; do not guess.

**Done when:** you can name the files you will create or change, and the existing components you are following.

## Step 1: Placement, props & emits

- Put the component where the nearest similar ones live; a component used by one feature stays in that feature. Give it a multi-word name.
- Design props from the parent's side: the fewest that let it render, typed. Declare every emitted event with `defineEmits`, typed. Two-way binding through `v-model` (`defineModel()` on 3.4+), never by mutating a prop.
- For an existing component used in several places, keep its props and events backward compatible, or update every parent in the same change.

**Done when:** the component file exists with typed props and emits, and the typecheck (`vue-tsc` or the project's script) passes.

## Step 2: State & data

- Place each piece of state and load server data as `vue-state.md` says, following the nearest feature. If you add a mutation, refresh or invalidate what shows the changed data.
- A page reused for different route params follows `vue-state.md` › Router; anything the component starts is stopped as `vue-components.md` › Lifecycle & DOM says.

**Done when:** you can say where each piece of state lives and where the data comes from.

## Step 3: Render every state

| State | What the user sees |
|---|---|
| Loading | The project's skeleton/spinner pattern, not a blank area or layout jump |
| Error | A message the user can act on, with retry where it makes sense |
| Empty | An explicit empty state, not an empty container |
| Data | The content, with long text, long lists and missing optional fields handled; `v-for` keyed by id |
| Not permitted | Hidden or disabled the way the project does it (the API still enforces it) |

**Done when:** each row above that applies has a branch in the template.

## Step 4: Accessibility & styling

- Native elements and design-system components, a label for every control, an accessible name for icon-only buttons, and focus handling for anything that opens or closes (use the design system's dialog/menu primitives).
- Styling with the project's approach and tokens only.

**Done when:** every control can be reached and used with the keyboard, and lint (including the accessibility plugin, if present) passes.

## Step 5: Wire it in

- A new page: add it the way the project does (a file in `pages/` for Nuxt, a lazy-loaded route record for Vue Router, a page in `resources/js/Pages/` plus a server route for Inertia), with a route name, and add navigation links if asked.
- Register or export it the way neighbouring components are (Nuxt auto-imports `components/`; elsewhere, a direct import).
- Check: the dev server or build compiles, and the route renders.

## Step 6: Tests

Before writing tests, review the code you just wrote and what it relies on. If you find a design flaw, report it to the user rather than writing a test that enshrines it — e.g. a permission checked only in the UI, an error that is caught and never shown, a prop that is mutated.

Write tests with the project's runner and mount helper. At minimum:

| Case | Verify |
|---|---|
| Renders | Main content, found by role/label/text or the project's test selector |
| Primary interaction | The user action produces the visible result, or emits the right event with the right payload |
| Loading → data | The content after the mocked response (`await flushPromises()` or `findBy…`) |
| Error | The error state after an error response |
| Empty | The empty state for an empty response |
| Permissions | The control is absent/disabled for a user without them (if applicable) |

Run the new tests, then the full suite, in single-run mode (`vitest run`): watch mode never exits.

## Step 7: Wrap up

1. Run the project's lint, typecheck (`vue-tsc`) and format scripts on the changed files. A Vite build does not typecheck.
2. If a browser tool is available, open the page in the dev server, exercise the main interaction, and check the console for Vue warnings (missing keys, extraneous attributes, hydration mismatches).
3. Report:
   - Files created/changed
   - Where data comes from, and any refresh/invalidation added
   - The states handled, and who can see or use the component
   - Tests added and the output of the test run
   - Points the reviewer needs to decide (if any)

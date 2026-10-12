---
name: react-component
description: Add or change a React component, page or screen end to end, following the existing codebase's own patterns - placement, props, data loading, loading/error/empty states, routing, tests. Use when asked to add, build or change a React component, page, screen, view or widget in an existing project.
---

# React Component

The procedure for adding or changing one component or screen. The conventions live in `.claude/rules/react-*.md`; they are not repeated here. This skill is the order of work.

## Step 0: Read the context (mandatory, before writing code)

1. Read `AGENTS.md` and the `.claude/rules/react-*.md` files, especially each file's **Project-specific** section. Where they and the existing code disagree with this skill, they win.
2. Establish:
   - What renders the app (Next.js App Router / Pages Router, React Router/Remix, client-only SPA), and for the App Router whether this component must be a Client Component (it needs `'use client'` if it uses state, effects, event handlers or browser APIs).
   - Whether the component is **new** or an **existing** one being changed. If existing, read it, its callers (`grep` for its name) and its tests first.
   - Where its data comes from (props, the project's server-state layer, a store, the URL) and who may see it (permissions).
3. Find the 1–2 nearest components of the same kind (a page, a list, a card, a form…). Note and follow:
   - folder and file naming, named or default export, props typing
   - design-system components and styling used
   - how they load data, and how they render loading, error and empty states
   - where their tests live and which render helper they use
4. If the request lacks something that decides behaviour (what to show when empty, who may act, what happens on error, the design), ask; do not guess.

**Done when:** you can name the files you will create or change, and the existing components you are following.

## Step 1: Placement & props

- Put the component where the nearest similar ones live (feature folder or shared components); a component used by one feature stays in that feature.
- Design the props from the caller's side: the fewest that let it render, typed, with `on*` callbacks for events. Pass IDs or the data to render, not whole stores or setters.
- For an existing component used in several places, keep its props backward compatible, or update every caller in the same change.

**Done when:** the component file exists with its typed props, and the typecheck passes.

## Step 2: State & data

- Place each piece of state and load server data as `react-state.md` says, following the nearest feature. If you add a mutation, update or invalidate the affected queries.
- Effects follow `react-hooks.md` › Effects.

**Done when:** you can say where each piece of state lives and where the data comes from.

## Step 3: Render every state

Render, at minimum:

| State | What the user sees |
|---|---|
| Loading | The project's skeleton/spinner pattern, not a blank area or layout jump |
| Error | A message the user can act on, with retry where it makes sense |
| Empty | An explicit empty state, not an empty container |
| Data | The content, with long text, long lists and missing optional fields handled |
| Not permitted | Hidden or disabled the way the project does it (the API still enforces it) |

**Done when:** each row above that applies has a branch in the component.

## Step 4: Accessibility & styling

- Native elements and design-system components, a label for every control, an accessible name for icon-only buttons, and focus handling for anything that opens or closes (use the design system's dialog/menu primitives).
- Styling with the project's approach and tokens only.

**Done when:** every control can be reached and used with the keyboard, and lint (including `jsx-a11y`, if present) passes.

## Step 5: Wire it in

- A new page/screen: register the route the way the project does it (file-based route, router config), lazy-load it if similar routes are lazy, and add navigation links if asked.
- Export it the way neighbouring components are exported (an `index.ts` barrel only if the folder already has one).
- Check: the dev server or build compiles, and the route renders.

## Step 6: Tests

Before writing tests, review the code you just wrote and what it relies on. If you find a design flaw, report it to the user rather than writing a test that enshrines it — e.g. a permission checked only in the UI, an error that is caught and never shown, a prop that is never used.

Write tests with the project's runner and render helper, querying by role/label/text and acting with `user-event` if the project has it. At minimum:

| Case | Verify |
|---|---|
| Renders | Main content found by role/label/text |
| Primary interaction | The user action (`user-event`) produces the visible result, or calls the callback with the right arguments |
| Loading → data | `findBy…` the content after the mocked response |
| Error | The error state after an error response |
| Empty | The empty state for an empty response |
| Permissions | The control is absent/disabled for a user without them (if applicable) |

Run the new tests, then the full suite, in single-run mode (`vitest run`, or the runner's non-watch flag): watch mode never exits.

## Step 7: Wrap up

1. Run the project's lint, typecheck and format scripts on the changed files. A Vite build does not typecheck; run the typecheck separately.
2. If a browser tool is available, open the screen in the dev server, exercise the main interaction, and check the console for errors and warnings (keys, hydration, act).
3. Report:
   - Files created/changed
   - Where data comes from, and any cache invalidation added
   - The states handled, and who can see or use the component
   - Tests added and the output of the test run
   - Points the reviewer needs to decide (if any)

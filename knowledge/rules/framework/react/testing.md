---
paths:
  - "**/*.test.{js,jsx,ts,tsx}"
  - "**/*.spec.{js,jsx,ts,tsx}"
  - "**/__tests__/**"
  - "**/test-utils.{js,jsx,ts,tsx}"
  - "**/setupTests.{js,ts}"
  - "**/vitest.setup.{js,ts}"
  - "**/mocks/**"
  - "**/e2e/**"
  - "**/vitest.config.*"
  - "**/jest.config.*"
  - "**/playwright.config.*"
---

# React Testing

## Before writing tests

- Identify the tools from `package.json` and config files: the runner (Vitest or Jest), the DOM environment (`jsdom`/`happy-dom`), React Testing Library, network mocking (MSW), and the end-to-end tool (Playwright, Cypress). Use those; do not mix runners, and ask before adding a testing package.
- Read the runner's setup file (`setupTests.*`, `vitest.setup.*`, the `setupFiles` entry) and any custom render helper (`test-utils.tsx`, `renderWithProviders`). If the project wraps `render` with its providers (router, query client, store, theme, i18n), use that wrapper; do not rebuild the providers in each test.
- Read the 1–2 nearest tests of the same kind and follow their location (`*.test.tsx` beside the file, or `__tests__/`), naming and structure.
- Existing tests written to a project convention that differs from this rule: do not delete or rewrite them. If they have weaknesses, point them out and let the user decide.

## Running tests

- Run through the project's script, in single-run mode: `vitest` and Create React App's `react-scripts test` start in watch mode in an interactive terminal and never exit. Use `vitest run`, or pass the runner's non-watch option (`--watchAll=false`, or `CI=true`) through the script.
- While coding: run the relevant test files only. Before reporting done: run the full suite.
- Coverage: run CI's exact command and threshold; never set a different threshold.
- When a test fails, fix the code or the wrong test; never delete it, `.skip` it, leave an `.only` behind, or weaken the assertion to make it pass.
- Do not update snapshots blindly (`-u`): read the snapshot diff and confirm every change is intended.

## What to test

- Test what the user sees and does, not implementation: no assertions on state, props passed to children, hook internals, component instances, or CSS class names. A refactor that keeps behaviour must keep the tests green.
- Default to component/integration tests that render a feature with its real children. Unit-test pure functions (formatting, calculations, reducers) directly, without rendering. Do not shallow-render.
- Test a custom hook through a component that uses it; use `renderHook` (from `@testing-library/react`, React 18+) only for a hook shared by several components. `@testing-library/react-hooks` is deprecated. When a test calls a hook's function directly, wrap the call in `act()` — nothing else will flush the update.
- Add no new large snapshot tests: they pass for any change once updated, so they verify nothing. A small inline snapshot of a formatted value is fine.

## Queries

- Query the way a user finds things, in this order: `getByRole` (with `{ name }`), `getByLabelText`, `getByPlaceholderText` (a field with only a placeholder is missing its label — add one), `getByText`, `getByDisplayValue`, `getByAltText`/`getByTitle`; `getByTestId` last, only for what has no accessible role or text. Not being able to find an element by role is often an accessibility bug in the component.
- Query through `screen`, not the container or `querySelector`.
- `getBy*` for elements that must be there; `findBy*` (awaited) for elements that appear asynchronously; `queryBy*` only to assert absence (`expect(screen.queryByRole('alert')).not.toBeInTheDocument()`).
- Assert with jest-dom matchers when the project has them (`toBeInTheDocument`, `toBeVisible`, `toBeDisabled`, `toHaveValue`, `toHaveAccessibleName`), not with raw DOM properties.

## Interactions & async

- Simulate input with `user-event`, not `fireEvent`: create `const user = userEvent.setup()` before rendering, and `await` every call. `fireEvent` dispatches one event, skipping the focus, keyboard and pointer events a real user produces.
- Wait for the UI, not for time: `await screen.findBy…`, or `await waitFor(() => expect(...))` with one assertion and no side effects inside the callback. No arbitrary `sleep`/`setTimeout` in tests.
- An "update was not wrapped in act(...)" warning in a component test means the test ended or asserted before an update finished. Await the resulting UI change (`findBy…`); do not silence it by wrapping `user-event` or `render` calls in `act()` — Testing Library already does. Calling a hook's function through `renderHook` is the exception (see above).
- Fake timers: `vi.useFakeTimers()`/`jest.useFakeTimers()`, restore in `afterEach`; with `user-event`, pass the clock: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. Fix the date with the runner's `setSystemTime` when output depends on now.

## Network & dependencies

- Never call a real API. With MSW in the project, mock at the network level: shared handlers for the happy path, `server.use(...)` inside a test for errors and edge cases, and `onUnhandledRequest: 'error'` so an unmocked request fails the test. Without MSW, mock the project's API module, not `fetch` internals or the component under test.
- MSW 2.x writes handlers with `http` and `HttpResponse`; 1.x uses `rest` and `ctx`. Check the installed major before copying one.
- Test the failure paths the component handles: an error response (e.g. 500) and an empty result, besides the happy path.
- TanStack Query: create a new `QueryClient` per test with retries off (`defaultOptions: { queries: { retry: false } }`); a shared client leaks cached data between tests, and the default three retries with backoff make error tests time out.
- Mock modules (`vi.mock`/`jest.mock`) only at boundaries the test cannot control (the API client, analytics, browser APIs jsdom lacks such as `IntersectionObserver` or `matchMedia`). Never mock the component under test or React itself.

## Accessibility checks

- If the project has `jest-axe` or `vitest-axe`, add an axe check to tests of new components: `expect(await axe(container)).toHaveNoViolations()`. It catches missing labels and invalid ARIA; it cannot check color contrast in jsdom, which computes no styles.

## When a component test is not enough

jsdom has no layout engine. Element sizes and positions are all zero, nothing scrolls, and CSS transitions, media queries, drag-and-drop, the clipboard, iframes and popups behave nothing like a browser. Behaviour that depends on them belongs in a real-browser test (Playwright, Cypress, or their component-testing modes) if the project has one; otherwise say it is untested. Do not mock `getBoundingClientRect` or `scrollHeight` to make a jsdom test pass — it then tests the mock.

Visual regressions are caught by screenshot comparison in a real browser (Playwright's `toHaveScreenshot()`, or the project's visual-testing service), not by DOM snapshots.

## Minimum coverage

- A new component or screen: it renders its main content, its primary interaction does what it should, and for data it loads, the loading, error and empty states.
- A form: valid submission (assert what was sent), a validation error shown on the right field, a server error, and that a pending submission cannot be sent twice.
- Permissions shown in the UI: the element is absent or disabled for a user without them.
- Fixing a bug: first write a test that reproduces it (and fails), then fix.
- Changes to wording, style or layout alone need no new test.
- Expected values are written out in the test (with fixed input and a fixed clock), not recomputed with the same code under test.

## End-to-end (Playwright)

- Locate with `page.getByRole`/`getByLabel`/`getByText`, and assert with web-first assertions (`await expect(locator).toBeVisible()`), which retry. No `page.waitForTimeout()`, no CSS/XPath selectors tied to markup.
- Each test sets up its own data and does not depend on another test's state or run order.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

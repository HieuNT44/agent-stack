---
paths:
  - "**/*.{test,spec}.{js,ts}"
  - "**/__tests__/**"
  - "**/{test,tests}/**/*.{js,ts,vue}"
  - "**/e2e/**"
  - "**/mocks/**"
  - "**/vitest.config.*"
  - "**/playwright.config.*"
  - "**/cypress.config.*"
  - "**/*.cy.{js,ts}"
  - "**/cypress/**"
---

# Vue Testing

## Before writing tests

- Identify the tools from `package.json` and config files: the runner (Vitest, or Jest with `@vue/vue3-jest`), the DOM environment (`jsdom`/`happy-dom`), the mounting library (`@vue/test-utils` or `@testing-library/vue`), network mocking (MSW), `@pinia/testing`, and the end-to-end tool (Playwright, Cypress). Use those; do not mix them, and ask before adding a testing package.
- Read the setup file and any shared mount helper (`mountWithPlugins`, a `renderComponent` in `tests/utils`). If the project installs Pinia, the router, i18n or a UI library through a helper or `config.global`, use it; do not re-register plugins in each test.
- Read the 1–2 nearest tests of the same kind and follow their location (beside the component, `__tests__/`, or `tests/unit/`), naming and selectors.
- Existing tests written to a project convention that differs from this rule: do not delete or rewrite them. If they have weaknesses, point them out and let the user decide.

## Running tests

- Run through the project's script, in single-run mode: `vitest` starts in watch mode in an interactive terminal and never exits. Use `vitest run`, or the script that wraps it.
- While coding: run the relevant test files only. Before reporting done: run the full suite.
- Coverage: run CI's exact command and threshold; never set a different threshold.
- When a test fails, fix the code or the wrong test; never delete it, `.skip` it, leave an `.only` behind, or weaken the assertion to make it pass.
- Do not update snapshots blindly (`-u`): read the snapshot diff and confirm every change is intended.

## What to test

- Test the component's contract — what it renders for given props and store state, what it emits, what it calls — not its internals: no assertions on `wrapper.vm` state, private methods or CSS class names. A refactor that keeps behaviour must keep the tests green.
- Prefer `mount` with real children. `shallowMount` stubs every child, so the test passes while the real composition is broken; stub only children that are heavy or out of scope (charts, maps), by name.
- Test composables through a small host component, or call them directly when they use no lifecycle hooks or `inject`. Unit-test pure functions without mounting.
- Add no new large snapshot tests: they pass for any change once updated, so they verify nothing.

## Selectors

- With Testing Library: query the way a user finds things — `getByRole` (with `{ name }`), `getByLabelText`, `getByText`; `getByTestId` last.
- With Vue Test Utils: find by role/text when practical; otherwise by a dedicated `data-test` (or the project's attribute) selector, not by class names or tag structure that styling changes.
- Not being able to find a control by role or label is often an accessibility bug in the component.

## Interactions & async

- Vue updates the DOM asynchronously. `await` every Vue Test Utils call that changes state (`await wrapper.trigger('click')`, `await input.setValue('x')`, `await wrapper.setProps({...})`) before asserting. With Testing Library, `await` `user-event` calls and use `findBy*` for what appears later.
- After a mocked request resolves, `await flushPromises()` (from `@vue/test-utils`) before asserting on the result.
- Assert emitted events with `wrapper.emitted('update:modelValue')` (VTU) or the `emitted()` returned by Testing Library's `render`, including the payload.
- Fake timers: `vi.useFakeTimers()`, restore in `afterEach`; fix the date with `vi.setSystemTime` when output depends on now.
- Unmount what you mount (VTU `enableAutoUnmount(afterEach)` if the project does not already); a component left mounted keeps listeners and timers alive into the next test.

## Stores, router & network

- Components using Pinia: `createTestingPinia({ initialState, createSpy: vi.fn })` from `@pinia/testing` if the project has it. It stubs actions by default; pass `stubActions: false` when the test needs them to run. Test stores on their own with `setActivePinia(createPinia())` in `beforeEach`.
- Components using the router: install a real router with `createMemoryHistory()` and the routes under test, and `await router.isReady()` after pushing the starting route; or mock `useRoute`/`useRouter` the way existing tests do.
- Never call a real API. With MSW in the project, mock at the network level, override per test with `server.use(...)` for errors and edge cases, and set `onUnhandledRequest: 'error'`. Without MSW, mock the project's API module, not the component under test.
- Test the failure paths the component handles: an error response and an empty result, besides the happy path.
- Nuxt components that use Nuxt composables: test them with `@nuxt/test-utils` (`mountSuspended`, `mockNuxtImport`) if the project has it.

## Minimum coverage

- A new component or page: it renders its main content, its primary interaction does what it should (visible result or emitted event), and for data it loads, the loading, error and empty states.
- A form: valid submission (assert what was sent), a validation error shown on the right field, a server error, and that a pending submission cannot be sent twice.
- Fixing a bug: first write a test that reproduces it (and fails), then fix.
- Changes to wording, style or layout alone need no new test.
- Expected values are written out in the test (with fixed input and a fixed clock), not recomputed with the same code under test.

## End-to-end

- Playwright: locate with `page.getByRole`/`getByLabel`/`getByText` and assert with web-first assertions (`await expect(locator).toBeVisible()`); no `page.waitForTimeout()`. Cypress: no `cy.wait(<ms>)`; wait on aliased requests or assertions.
- Each test sets up its own data and does not depend on another test's state or run order.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

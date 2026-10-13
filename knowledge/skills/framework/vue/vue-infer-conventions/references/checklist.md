# Convention checklist

Each item is a **real fork in the road**: Vue allows several valid approaches, and the project's choice changes the code Claude writes. The search hints are only a starting point: always read a few real files before concluding.

Items marked **→ AGENTS.md** are recorded in `AGENTS.md` (the section in parentheses), not in a rule. Everything else goes in the Project-specific section of the rule named in the group heading.

Not in the checklist (skip): pure formatting (Prettier/Biome handles it), anything an enabled `eslint-plugin-vue` rule enforces, and Vue defaults the agent already writes correctly.

## → vue-components.md

| # | Fork | Search hints |
|---|---|---|
| P1 | **Framework & routing**: Nuxt (file-based `pages/`, layers) / Vite SPA with Vue Router / Vue CLI / Inertia (server routes, pages in `resources/js/Pages/`); route records in one file or per module **→ AGENTS.md (Code & architecture)** | `package.json`; `nuxt.config.*`; `src/router/`; `@inertiajs/vue3` |
| P2 | **Component API**: `<script setup>` / `defineComponent` + `setup()` / Options API; boundary if mixed **→ AGENTS.md (Code & architecture)** | read 5 components, old and new |
| P3 | **Folder structure**: by type (`components/`, `views/`, `stores/`) / by feature or module (`modules/<name>/`); whether modules may import each other **→ AGENTS.md (Code & architecture)** | top-level folders; ESLint import rules |
| P4 | **UI library / design system**: in-repo base components / Vuetify / Element Plus / Naive UI / PrimeVue / Quasar / Nuxt UI / Reka UI; which primitives to use for dialogs, menus, toasts | `package.json`; `components/base`, `components/ui` |
| P5 | **Styling**: `<style scoped>` / CSS Modules / Tailwind / UnoCSS / Sass | config files; read 3 components |
| P6 | **Props & emits style**: type-based or runtime declarations; `withDefaults` or destructured defaults; `defineModel` or `modelValue` + emit | read 5 components |
| P7 | **State style**: `ref` per value or one `reactive()` object | grep `reactive(` vs `ref(` in components |
| P8 | **Composables**: where they live, naming, whether they return refs or `reactive`; VueUse for browser helpers | `src/composables`, `composables/`; `package.json` |
| P9 | **Errors & loading**: global `errorHandler`, `onErrorCaptured` boundaries, Nuxt `error.vue`/`showError`; shared loading/empty/error components; toast library | grep `errorHandler\|onErrorCaptured\|toast` |

## → vue-state.md

| # | Fork | Search hints |
|---|---|---|
| S1 | **Data fetching**: Nuxt `useFetch`/`useAsyncData` / TanStack Vue Query / Pinia Colada / store actions / composables / in components **→ AGENTS.md (Code & architecture)** | grep `useFetch\|useQuery\|useAsyncData\|axios` |
| S2 | **API client**: axios instance / `$fetch`/`ofetch` wrapper / generated SDK; its error shape and interceptors | `src/api`, `src/services`, `utils/` |
| S3 | **Client state**: Pinia option stores / Pinia setup stores / Vuex / composables with shared refs / none; persistence plugin **→ AGENTS.md (Code & architecture)** | `package.json`; `src/stores`, `src/store` |
| S4 | **Forms & validation**: VeeValidate / FormKit / Vuelidate / UI-library forms / plain `v-model`; schema library (Zod, Yup, Valibot) | `package.json`; read 2 forms |
| S5 | **Router conventions**: named routes or paths; guards in the router file or per route; Nuxt route middleware | `src/router/`, `middleware/` |

## → vue-security.md

| # | Fork | Search hints |
|---|---|---|
| X1 | **Auth**: where the session comes from (store, Nuxt `useState`, an auth module); route guards or middleware; a permission directive or composable | grep `beforeEach\|defineNuxtRouteMiddleware\|v-can\|usePermission` |
| X2 | **Sanitizer** for `v-html` content, if any | grep `DOMPurify\|sanitize` |

## → vue-conventions.md

| # | Fork | Search hints |
|---|---|---|
| C1 | **Commands**: package manager, dev, lint, typecheck, build, how CI runs them; container wrapper; monorepo filter **→ AGENTS.md (Commands & environment)** | lockfile; `package.json` scripts; CI config |
| C2 | **File naming**: PascalCase or kebab-case `.vue` files; base-component prefix (`Base`, `App`, `V`) | `ls` component folders |
| C3 | **Imports**: path alias (`@/`, `~/`); Nuxt auto-imports or explicit imports; `unplugin-auto-import`/`unplugin-vue-components` in a Vite app | `tsconfig` `paths`; Vite plugins |
| C4 | **i18n**: none / vue-i18n / `@nuxtjs/i18n`; key style; `useI18n` or global `$t` | `package.json`; `locales/` |

## → vue-testing.md

| # | Fork | Search hints |
|---|---|---|
| T1 | **Mounting library**: Vue Test Utils / Testing Library; Vitest or Jest; jsdom or happy-dom | `package.json`; test config |
| T2 | **Test and coverage commands**, CI threshold **→ AGENTS.md (Commands & environment)** | CI config, `package.json` scripts |
| T3 | **Shared mount helper** and plugins installed for every test (`config.global`) | setup file, `tests/utils` |
| T4 | **Stores and router in tests**: `@pinia/testing` / real Pinia; real router with memory history / mocked `useRoute` | read 3 component tests |
| T5 | **Selectors**: `data-test` / `data-testid` / role queries | grep `data-test` |
| T6 | **Test location and naming**: beside the component / `__tests__` / `tests/unit` | `ls` |
| T7 | **E2E tool and how it runs** (Playwright, Cypress; against which server) | `e2e/`, `cypress/`, CI |

## → vue-accessibility.md

| # | Fork | Search hints |
|---|---|---|
| A1 | **Accessibility tooling**: `eslint-plugin-vuejs-accessibility`, axe in tests, Storybook a11y addon | `package.json`; ESLint config |
| A2 | **Input wrapper pattern**: how base inputs forward `id`/`aria-*` (`inheritAttrs: false` + `v-bind="$attrs"`) | read the base input components |

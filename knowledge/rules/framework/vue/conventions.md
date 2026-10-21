# Vue Conventions

## Tooling & style

- Detect the package manager from the lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `yarn.lock` → Yarn, `bun.lock`/`bun.lockb` → Bun) or the `packageManager` field in `package.json`. Use only that one; a second lockfile in the repo is a bug.
- Run checks through the `package.json` scripts (`lint`, `type-check`, `test:unit`, `format`…) so the result matches CI; do not assemble your own command when a script exists.
- Check `package.json` and the config files for ESLint (with `eslint-plugin-vue`), Prettier, Biome and TypeScript. If present, run them on the changed files before reporting done; on a violation, fix the code — do not loosen the config.
- Typecheck `.vue` files with `vue-tsc --noEmit` (`vue-tsc --build` with project references) or the project's `type-check` script. Plain `tsc` does not read `.vue` files, and a Vite build strips types without checking them, so a passing build proves nothing about types.
- Do not add `eslint-disable`, `// @ts-ignore`, `// @ts-nocheck` or `as any` to get past a check. If a suppression is genuinely unavoidable, use `// @ts-expect-error` with the reason on the same line.
- Format only the files you changed; do not mass-reformat unrelated files.
- Leave no `console.log`, `debugger`, or commented-out code behind.
- Do not change dependencies (install, remove, upgrade) without approval. Before adding a library for something small, check whether the project already has one that does it (VueUse covers many browser and timing helpers).
- Do not read `.env` files; read `.env.example` and the config that consumes the variables.

## Versions & framework

- Check the Vue version (`package.json`, then the lockfile for the installed one) before using a newer API:
  - Vue 3.3+: `defineOptions`, `defineSlots`, generic components (`<script setup lang="ts" generic="T">`), `toValue`, the tuple syntax for `defineEmits` (`{ change: [id: number] }`).
  - Vue 3.4+: `defineModel` (stable), same-name `v-bind` shorthand (`:id` for `:id="id"`), `watch` option `once`.
  - Vue 3.5+: reactive props destructure (`const { count = 0 } = defineProps<…>()`), `useTemplateRef`, `useId`, `onWatcherCleanup`.
- Vue 2 reached end of life on 31 December 2023. In a Vue 2 codebase, write Vue 2 code (Options API, or `@vue/composition-api`/2.7's built-in Composition API); do not use Vue 3-only APIs.
- Identify what runs the app before writing code, because the rules differ:
  - **Nuxt** (`nuxt.config.*`): server-side rendering by default, file-based routing in `pages/`, auto-imports for Vue APIs, composables and components, data loading with `useFetch`/`useAsyncData`.
  - **Vite SPA** (`create-vue`) or legacy **Vue CLI**: client-only; routing with Vue Router; imports are explicit.
  - **Inertia** (`@inertiajs/vue3`, usually inside Laravel): no Vue Router; routes are defined on the server, pages in `resources/js/Pages/` receive their data as props from the controller, links use `<Link>`, forms use Inertia's `useForm`.
- Write new components in the API the project uses: `<script setup>` with the Composition API, or the Options API. Do not mix both styles in one component, and do not convert existing components unless asked.

## TypeScript

- If the project uses TypeScript, new components use `<script setup lang="ts">` and new modules are `.ts`. Match the project's `tsconfig` strictness; never relax it.
- Declare props and emits with type-based declarations (`defineProps<Props>()`, `defineEmits<…>()`) when the project uses TypeScript, the runtime form (`defineProps({ … })`) otherwise.
- No `any`. Data from outside the program (API responses, `localStorage`, `JSON.parse`, route params) is `unknown` until validated or narrowed; with a schema library in the project (Zod, Valibot, Yup), parse it. Never assert its type with `as User`.
- Type `provide`/`inject` with an `InjectionKey<T>` symbol shared by both sides, not a bare string key.

## Naming & files

| Kind | Convention | Example |
|---|---|---|
| Component name | Multi-word, PascalCase (single words collide with current and future HTML elements) | `OrderSummary`, not `Order` |
| SFC file | PascalCase, or kebab-case if the project uses it consistently | `OrderSummary.vue` |
| Base/presentational components | A shared prefix (`Base`, `App`, `V`) | `BaseButton` |
| Tightly coupled child | Parent name as prefix | `OrderListItem` |
| Composable | `use` + camelCase, in `composables/` | `useOrderTotals` |
| Pinia store | `use…Store`, id matching the file | `useCartStore` in `stores/cart.ts` |
| Props | camelCase in script; kebab-case or camelCase in templates, as the project does | `isActive` / `is-active` |
| Emitted events | camelCase in `defineEmits`, listened to as `@kebab-case` or `@camelCase`, as the project does | `emit('itemSelected')` |

- Import through the project's path alias (`@/…`, `~/…`) when one is configured.
- In Nuxt, rely on auto-imports like the existing code does; do not add explicit imports for auto-imported APIs unless the project writes them.

## Code structure

- Keep templates declarative: move anything beyond a simple expression into a `computed` or a method. No complex logic, chained ternaries or function calls with side effects in templates.
- Inside `<script setup>`, order code the way neighbouring components do (typically: imports, props/emits, composables and stores, state, computed, watchers, functions, lifecycle hooks).
- A component that does several things (fetching, transforming, rendering several sections) is split. Extract reusable stateful logic into a composable, and pure logic (formatting, calculations, mapping API shapes) into plain functions that can be unit tested without mounting.
- A component file past ~200 lines is a signal to look.
- No magic numbers/strings: limits, durations and route names go in a named constant or the project's config.
- Extract shared code only once the logic is actually duplicated (≥2 places); do not add props, options or abstraction layers for needs that do not exist yet.
- User-facing text goes through the project's i18n (`$t`/`t` from vue-i18n) when it has one; do not hard-code strings next to translated ones.

## Comments

- Comments explain WHY (business reasons, browser quirks, workarounds with a link to the issue), not WHAT the template already says.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

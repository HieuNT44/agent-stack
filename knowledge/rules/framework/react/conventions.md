# React Conventions

## Tooling & style

- Detect the package manager from the lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `yarn.lock` → Yarn, `bun.lock`/`bun.lockb` → Bun) or the `packageManager` field in `package.json`. Use only that one; a second lockfile in the repo is a bug.
- Run checks through the `package.json` scripts (`lint`, `typecheck`, `test`, `format`…) so the result matches CI; do not assemble your own command when a script exists.
- Check `package.json` (`devDependencies`, `scripts`) and the config files for ESLint (`eslint.config.*`, `.eslintrc*`), Prettier, Biome and TypeScript. If present, run them on the changed files before reporting done; on a violation, fix the code — do not loosen the config.
- Do not add `eslint-disable`, `// @ts-ignore`, `// @ts-nocheck` or `as any` to get past a check. In particular, never silence `react-hooks/exhaustive-deps`: a missing dependency is a stale-value bug, not a style issue. If a suppression is genuinely unavoidable, use `// @ts-expect-error` with the reason on the same line.
- A Vite build strips types without checking them, so `vite build` passing proves nothing about types. Run the project's typecheck script, or `tsc --noEmit` (`tsc -b` for a project-references setup), separately.
- Format only the files you changed; do not mass-reformat unrelated files.
- Leave no `console.log`, `debugger`, or commented-out code behind. Keep `console.error`/`console.warn` only where the project already logs that way.
- Do not change dependencies (install, remove, upgrade) without approval. Before adding a library for something small (a date helper, a debounce), check whether the project already has one that does it.
- Do not read `.env` files; read `.env.example` and the config that consumes the variables.

## Versions & framework

- Check the React version (`package.json`, then the lockfile for the installed one) before using a newer API:
  - React 18+: `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`, automatic batching everywhere.
  - React 19+: `use`, `useActionState`, `useOptimistic`, `useFormStatus` (from `react-dom`), `<form action={fn}>`, `ref` as a regular prop (no `forwardRef` needed), `<Context>` as a provider.
  - React 19.2+: `useEffectEvent`, `<Activity>`.
- Identify what renders the app before writing a component, because the rules differ:
  - **Next.js App Router** (`app/` with `layout.tsx`): components are Server Components by default; anything using state, effects, event handlers or browser APIs needs `'use client'` at the top of its file.
  - **Next.js Pages Router** (`pages/`), **React Router / Remix** (route modules with `loader`/`action`), or a **client-only SPA** (Vite, legacy Create React App): no Server Components; do not add `'use client'`.
- Follow the structure of the files that exist, not the newest documentation: a project upgraded to React 19 may still use `forwardRef` everywhere.
- These rules are written for React DOM. In a React Native project (`react-native` or `expo` in `package.json`), the hooks, state and testing guidance still applies, but skip everything about the DOM: HTML elements and attributes, `href`, CSS and Tailwind, `window`/`document`, and the accessibility attributes (React Native has its own `accessibilityRole`/`accessibilityLabel` props).

## TypeScript

- If the project uses TypeScript, new files are `.ts`/`.tsx`. Match the project's `tsconfig` strictness; never relax it.
- Type props with `type` or `interface`, whichever the project uses. Do not introduce `React.FC` unless the project already uses it.
- No `any`. Data from outside the program (API responses, `localStorage`, `JSON.parse`, URL params, `postMessage`) is `unknown` until validated or narrowed; with a schema library in the project (Zod, Valibot, Yup), parse it. Never assert its type with `as User`.
- Model mutually exclusive states as a discriminated union (`{ status: 'loading' } | { status: 'error'; error: Error } | { status: 'success'; data: T }`), not several booleans that can contradict each other.
- Prefer `as const` objects or string-literal unions over `enum`, unless the project already uses enums.
- Import types with `import type { … }` when the project's ESLint or `tsconfig` (`consistent-type-imports`, `verbatimModuleSyntax`) requires it; under `verbatimModuleSyntax` a type imported as a value is a compile error.

## Naming & files

| Kind | Convention | Example |
|---|---|---|
| Component | PascalCase noun | `OrderSummary` |
| Hook | `use` + camelCase; must call at least one hook, otherwise it is a plain function | `useOrderTotals` |
| Context | `XContext` for the context, `XProvider` for the component that provides it, `useX` for the hook that reads it | `CartContext`, `CartProvider`, `useCart` |
| Event handler prop | `on` + event | `onSelect`, `onSubmit` |
| Handler inside a component | `handle` + event | `handleSelect` |
| Boolean | Reads as a predicate | `isOpen`, `hasError`, `canEdit` |
| Constant | UPPER_SNAKE for module-level fixed values | `MAX_UPLOAD_SIZE` |

- File names, folder layout, and named vs. default exports follow the nearest existing files. Framework files that must be default exports (Next.js `page`/`layout`, `React.lazy` targets, React Router route modules) stay that way.
- Import through the project's path alias (`@/…`, `~/…`) when one is configured in `tsconfig`/bundler config; do not mix alias and long relative paths for the same folder.
- One exported component per file; small private subcomponents may live beside it in the same file.

## Code structure

- Prefer early returns and guard clauses over nested conditions.
- A component that does several things (fetching, transforming, rendering several sections) is split. A component file past ~200 lines is a signal to look.
- No magic numbers/strings: limits, durations, breakpoints and route paths go in a named constant or the project's config/route helper.
- Extract shared code only once the logic is actually duplicated (≥2 places); do not add props, options or abstraction layers for needs that do not exist yet.
- Keep pure logic (formatting, calculations, mapping API shapes) in plain functions outside components, where it can be unit tested without rendering.
- User-facing text goes through the project's i18n function when it has one; do not hard-code strings next to translated ones.

## Comments

- Comments explain WHY (business reasons, browser quirks, workarounds with a link to the issue), not WHAT the JSX already says.
- Add JSDoc only where types cannot express enough, or on a shared component's props the project documents that way.

## Project-specific

Rules specific to this project. Where they differ from, or are more specific than, the general rules above, follow this section.

# Convention checklist

Each item is a **real fork in the road**: React allows several valid approaches, and the project's choice changes the code Claude writes. The search hints are only a starting point: always read a few real files before concluding.

Items marked **→ AGENTS.md** are recorded in `AGENTS.md` (the section in parentheses), not in a rule. Everything else goes in the Project-specific section of the rule named in the group heading.

Not in the checklist (skip): pure formatting (Prettier/Biome handles it), anything an enabled ESLint rule enforces, and React defaults the agent already writes correctly.

## → react-components.md

| # | Fork | Search hints |
|---|---|---|
| P1 | **Framework & router**: Next.js App Router / Pages Router, React Router (library or framework mode), Remix, TanStack Router, Vite SPA, CRA; where routes are declared **→ AGENTS.md (Code & architecture)** | `package.json`; `app/`, `pages/`, `routes.ts`, router config |
| P2 | **Folder structure**: by type (`components/`, `hooks/`) / by feature (`features/<name>/`); whether features may import each other **→ AGENTS.md (Code & architecture)** | top-level folders; ESLint `import/no-restricted-paths` or a boundaries plugin |
| P3 | **Component library / design system**: in-repo (`components/ui`) / shadcn/ui / MUI / Chakra / Mantine / Radix / Headless UI; which primitives to use for dialogs, menus, toasts | `package.json`; `components/ui` |
| P4 | **Styling**: Tailwind / CSS Modules / styled-components / Emotion / vanilla-extract / Sass; the class-merging helper (`cn`, `clsx`, `twMerge`) | config files; read 3 components |
| P5 | **Component style**: function declarations or arrow functions; props as `type` or `interface`; `React.FC`; `forwardRef` or `ref` prop | read 5 components |
| P6 | **Memoization**: React Compiler enabled / manual `memo`/`useMemo`/`useCallback` habit / neither | `babel-plugin-react-compiler`, `reactCompiler` in the Next config; grep `useCallback` |
| P7 | **Errors & loading**: error boundary mechanism (`react-error-boundary`, route `ErrorBoundary`, `error.tsx`); shared loading/empty/error components | grep `ErrorBoundary\|Suspense`; `components/` |

## → react-hooks.md

| # | Fork | Search hints |
|---|---|---|
| H1 | **Where custom hooks live and how they are named** (`hooks/`, per feature; `useX.ts` or `use-x.ts`) | `ls` hook folders |
| H2 | **Shared hooks the project expects to be reused** (`useDebounce`, `useMediaQuery`, a hooks library such as `usehooks-ts`) | `src/hooks`; `package.json` |

## → react-state.md

| # | Fork | Search hints |
|---|---|---|
| S1 | **Server state**: TanStack Query / SWR / RTK Query / Apollo / router loaders / Server Components / effects; where query hooks and keys live **→ AGENTS.md (Code & architecture)** | `package.json`; grep `useQuery\|useSWR\|createApi\|loader` |
| S2 | **API client**: `fetch` wrapper / `axios` instance / generated SDK (OpenAPI, GraphQL codegen); where it lives; its error shape | grep `axios.create\|createClient`; `src/api`, `src/lib` |
| S3 | **Client state**: none beyond components / Context / Redux Toolkit / Zustand / Jotai **→ AGENTS.md (Code & architecture)** | `package.json`; `src/store`, `src/stores` |
| S4 | **Forms & validation**: React Hook Form / Formik / TanStack Form / framework actions / plain state; schema library (Zod, Yup, Valibot) | `package.json`; read 2 forms |
| S5 | **URL state**: filters/pagination in search params or in component state; the helper used | grep `useSearchParams` |

## → react-security.md

| # | Fork | Search hints |
|---|---|---|
| X1 | **Auth**: where the session comes from (cookie, token in storage, a framework/auth library); route guards; a permission hook or component | grep `useAuth\|useSession\|ProtectedRoute\|can(` |
| X2 | **Sanitizer** for HTML content, if any | grep `DOMPurify\|sanitize` |

## → react-conventions.md

| # | Fork | Search hints |
|---|---|---|
| C1 | **Commands**: package manager, dev, lint, typecheck, build, how CI runs them; container wrapper; monorepo filter **→ AGENTS.md (Commands & environment)** | lockfile; `package.json` scripts; CI config |
| C2 | **File naming and exports**: PascalCase or kebab-case files; named or default exports; barrel `index.ts` files | `ls` component folders |
| C3 | **Path alias** (`@/`, `~/`) | `tsconfig` `paths` |
| C4 | **i18n**: none / react-i18next / react-intl / next-intl / Lingui; key style | `package.json`; `locales/`, `messages/` |

## → react-testing.md

| # | Fork | Search hints |
|---|---|---|
| T1 | **Runner and environment**: Vitest / Jest; jsdom / happy-dom | `package.json`; test config |
| T2 | **Test and coverage commands**, CI threshold **→ AGENTS.md (Commands & environment)** | CI config, `package.json` scripts |
| T3 | **Render helper** that wraps providers (`renderWithProviders`, `test-utils.tsx`) | `src/test`, `test-utils.*` |
| T4 | **Network mocking**: MSW (where handlers live) / mocked API module | `src/mocks`, `vi.mock(` |
| T5 | **Test location and naming**: beside the file / `__tests__` / `tests/`; `describe`/`it` style | `ls`; read 3 tests |
| T6 | **E2E tool and how it runs** (Playwright, Cypress; against which server) | `e2e/`, config files, CI |

## → react-accessibility.md

| # | Fork | Search hints |
|---|---|---|
| A1 | **Accessibility tooling**: `eslint-plugin-jsx-a11y`, `jest-axe`/`vitest-axe`, Storybook a11y addon | `package.json`; ESLint config |
| A2 | **Focus/announcement handling on route change**, if the project has one | router setup; grep `aria-live` |

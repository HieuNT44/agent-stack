---
name: vue-verify
description: Verify a Vue or Nuxt change before opening a PR or merging - formatting, lint, vue-tsc typecheck, tests, coverage, production build, leftover debug code - using the project's own scripts, then report pass/fail/skip.
disable-model-invocation: true
---

# Vue Verify

Run the pre-PR checks. Only check and fix code; do not deploy, publish, or push.

## Step 0: Collect the project's commands

Do not guess commands. Take them in this order of precedence:

1. `AGENTS.md` › Commands & environment.
2. The **Project-specific** sections of `.claude/rules/vue-conventions.md` and `vue-testing.md`.
3. The CI config (`.github/workflows/*.yml`, `.gitlab-ci.yml`…): the steps CI runs are the bar to meet.
4. `package.json` › `scripts` (`lint`, `type-check`, `test:unit`, `test:e2e`, `format`, `build`…) and `devDependencies` (ESLint, Prettier, Biome, `vue-tsc`, Vitest, Playwright/Cypress).
5. The package manager, from the lockfile or the `packageManager` field, and the Node version (`.nvmrc`, `.node-version`, `engines`). Run every script through that package manager.
6. A monorepo (`pnpm-workspace.yaml`, `workspaces`, Turborepo, Nx): run the checks for the affected package, the way CI does.

Write down the list of commands before running them. A tool the project does not have is marked **skip**; do not install it.

## Step 1: Determine the scope of the change

- `git status` and `git diff --name-only <base branch>...HEAD` (take the base branch from CI, or ask).
- Note: which source files changed, whether `package.json` or the lockfile is touched, whether config (`tsconfig`, `vite.config`, `nuxt.config`, ESLint) is touched.

## Step 2: Run the checks

Run them in order. When a step fails: fix the code, rerun that step, and only then move on.

| # | Check | How to run | Notes |
|---|---|---|---|
| 1 | Install | Only when `package.json`/the lockfile is touched: the frozen install (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable` (Yarn 1: `--frozen-lockfile`), `bun install --frozen-lockfile`) | A failure means the lockfile is out of sync with `package.json` |
| 2 | Formatting | The project's script, or Prettier/Biome in check mode on the **changed files** | Do not format the whole repo |
| 3 | Lint | The project's script, or ESLint on the changed files | Add no `eslint-disable`, do not turn rules off or downgrade them |
| 4 | Typecheck | The project's script, or `vue-tsc --noEmit` (`vue-tsc --build` with project references); Nuxt: `nuxi typecheck` | Required even when the build passes: Vite does not typecheck. Add no `@ts-ignore`/`any` |
| 5 | Related tests | The project's unit-test command in single-run mode for the changed code's test files | `vitest run <path>` |
| 6 | Full test suite | The project's unit-test command, single-run mode | |
| 7 | Coverage | Only when CI enforces a threshold: CI's exact command and threshold | |
| 8 | Build | The project's `build` script | Catches what tests do not: SSR-only failures, missing env at build, broken async imports |
| 9 | End-to-end | Only when CI runs them and they can run locally (the app and its dependencies start); otherwise skip and say so | |
| 10 | Leftover debug code | Search the diff for `console.log`, `debugger`, `.only(`, newly added `.skip(`, `@ts-ignore`, `eslint-disable`, commented-out code | |
| 11 | Dependencies | Only when the lockfile is touched: the package manager's audit (`npm audit --omit=dev`, `pnpm audit --prod`) | Report findings; do not upgrade packages yourself |

## Rules when fixing failures

- Fix the code to pass the check; do not loosen tool config, skip or delete tests, update snapshots without reading the diff, or weaken assertions.
- Pre-existing failures not caused by this change: do not fix them; list them in the report.
- Failures that need a business decision, or a large fix outside the scope: stop and ask.

## Step 3: Report

```
| # | Check      | Result    | Notes                                   |
|---|------------|-----------|-----------------------------------------|
| 4 | Typecheck  | fail→pass | fixed emit payload type in OrderList.vue |
| 6 | Full suite | pass      | 212 tests                               |
| 9 | End-to-end | skip      | needs the API running; CI runs it       |
```

Also include:
- The commands run (verbatim)
- Files changed during verification
- Pre-existing failures (not part of this change)
- Verdict: **ready for PR** or **not ready**, with the reason

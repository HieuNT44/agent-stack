---
name: vue-infer-conventions
description: Survey a Vue or Nuxt codebase for the project's real commands, architecture and conventions, then record them in AGENTS.md and the "Project-specific" section of .claude/rules/vue-*.md. Use when setting up the template for a new repo, or when asked to detect/document/update project conventions.
disable-model-invocation: true
---

# Vue Infer Conventions

Record how the project **currently** does things, in the right place. Describe reality; do not improve it.

Inspired by the `infer-conventions` skill from [laravel/boost](https://github.com/laravel/boost).

## Where things go

| Information | Destination |
|---|---|
| Install, dev server, test, lint, typecheck and build commands; package manager; native or through a container; monorepo filter | `AGENTS.md` › Commands & environment |
| Architecture overview: Nuxt or Vite SPA, Options or Composition API, folder structure, data-fetching layer, store, layers NOT used | `AGENTS.md` › Code & architecture (a few lines) |
| Details that matter when writing code (API client, form library, UI library, styling, test helpers…) | The **Project-specific** section of the matching rule in `.claude/rules/vue-*.md` |
| Allow rules for commands run through a container | `.claude/settings.json` |

`AGENTS.md` is always loaded and every AI tool reads it; rules are read only by Claude Code, and a rule with `paths:` is loaded only when working on matching files.

Record each fact in **one** place only. If it is already in `AGENTS.md`, the rules do not repeat it.

Do not fill in the `AGENTS.md` sections that cannot be inferred from code: Workflow, Security, Gotchas. Ask the user in Step 3; if they do not answer, leave them as they are.

## Principles (read before starting)

- **Reality is the standard.** The style used by the majority of the code is the convention, even when a "better" way exists. Do not propose improvements while recording.
- **Record choices, not defaults.** The question for every candidate: *without this line, would Claude write the code differently?* Record it only if the answer is yes. Anything the general rules in the rule files already say is not repeated.
- **Record deliberate absences too.** E.g. "No Pinia; shared state lives in composables (client-only app)", so Claude does not add a layer.
- **Architecture matters most**: Nuxt or SPA, the component API style, folder structure (by type or by module), the data-fetching layer, the store, the API client.
- **Evidence is required**: ≥3 consistent examples, with any competing style under ~20%. Otherwise skip it. For commands, the evidence is the CI config, `package.json` scripts, or a successful trial run.
- **Report conflicts; do not pick for the user.** If two styles both have a significant share (Options API in old modules and `<script setup>` in new ones, Vuex beside Pinia mid-migration), ask the user whether a boundary explains them; if not, report it as an unresolved conflict and record nothing.
- **Leave what the tools enforce.** Style that ESLint (`eslint-plugin-vue`), Prettier, Biome or `tsconfig` already enforce (per their enabled config) is not recorded.
- **State the convention only**: 1–2 imperative sentences, at most one short syntax snippet. No counts, ratios or lists of evidence files.

## Step 0: Orientation

1. Read `AGENTS.md`, `CLAUDE.md` and every `.claude/rules/vue-*.md` file: the general rules (to know what is already the default) and whatever the project has already filled in (skip anything already recorded, unless asked to update it).
2. Read `package.json` (versions; dependencies such as Nuxt, Vue Router, Pinia/Vuex, TanStack Vue Query, VeeValidate/FormKit, the UI library, VueUse, Vitest, `@vue/test-utils`/Testing Library, MSW, Playwright/Cypress), the lockfile name, `tsconfig*.json`, `vite.config.*`/`nuxt.config.*`/`vue.config.js`, the lint/format config, the test config and setup files, and the CI config.
3. Identify what runs the app (Nuxt, Vite SPA, Vue CLI, Inertia inside Laravel), the Vue version and the dominant component style (`<script setup>`, `defineComponent` + `setup()`, Options API), and list the top-level folders under `src/` (`resources/js/` for Inertia, or the Nuxt root). Folders beyond the usual (`components`, `views`/`pages`, `composables`, `stores`, `router`, `assets`) are architectural signals to confirm in Step 2.
4. Determine how commands are run: natively or in a container (`docker-compose.yml`, `Makefile`, `devcontainer.json`), and in a monorepo, how CI targets one package.

**Done when:** you have the list of dependencies, tools, non-standard folders, and how commands are run.

## Step 1: Scan against the checklist

Open `references/checklist.md` and go through every item that applies to the project. For each item, read a few real files (never conclude from grep counts alone), then assign exactly one verdict:

| Verdict | Meaning | Action |
|---|---|---|
| Pattern | Enough evidence; a real choice | Candidate to record, with 2–3 example files |
| Conflict | Two styles both significant | Report with counts and files; ask the user |
| Default | Consistent, but the same as the general rules/Vue defaults | Skip |
| Insufficient signal | Too few examples, or not used | Skip |
| Tool-enforced / already recorded | Per the principles above | Skip |

On a large project, if a subagent tool is available: split the checklist groups across subagents running in parallel, each returning (item, verdict, evidence, proposed wording, destination file).

**Done when:** every applicable item has exactly one verdict.

## Step 2: Architecture and project quirks

1. For each non-standard folder from Step 0: confirm how it is used (e.g. `modules/<name>/` holds that module's components, store and API calls, and modules do not import each other), applying the same evidence standard.
2. Look for other codebase-specific traits: a shared mount helper for tests, the API client's error shape, global components or plugins registered in `main.ts`/Nuxt plugins, a permission directive (`v-can`), a page layout convention. At most ~5 items beyond architecture.

**Done when:** each non-standard folder has a verdict, and the quirks list has at most ~5 items.

## Step 3: Confirm with the user

Present all candidates **at once**, grouped by destination file:

```
### AGENTS.md › Commands & environment
1. [Pattern] pnpm; unit tests with Vitest. Evidence: pnpm-lock.yaml, .github/workflows/ci.yml.
   Proposed: "One test file: `pnpm vitest run <path>`. Typecheck: `pnpm type-check`."

### AGENTS.md › Code & architecture
2. [Pattern] Components use <script setup lang="ts">; shared client state in Pinia setup stores.
   Proposed: "Components use `<script setup lang="ts">`. Shared client state lives in Pinia setup stores in `src/stores/`."

### vue-state.md
3. [Pattern] API calls live in src/api/<resource>.ts on the axios instance in src/api/client.ts.
   Proposed: "Call the API through `src/api/<resource>.ts`, built on the axios instance in `src/api/client.ts`. Components never import axios."
4. [Conflict] State: 18 components use one reactive() object, 9 use separate refs. Is there a boundary?

### Needs the user (cannot be inferred from code)
- AGENTS.md › Workflow: branch, commit and PR format?
- AGENTS.md › Security: which external services are allowed, what must be asked first?
```

Record only the items the user approves. If the user explicitly says "record everything" or "no need to ask", record every Pattern; Conflicts still need asking.

## Step 4: Write

**AGENTS.md:**
- Write into the right section; replace the placeholder and delete the guidance `<!-- -->` comment of each section you fill. Leave sections with no information as they are.
- Commands are recorded verbatim and runnable as-is (including the package manager and any container runner).
- Keep the whole file under 200 lines.

**Rules** (`.claude/rules/vue-*.md`):
- Write into the `## Project-specific` section of the destination file, below the section's opening sentence. Do not edit the general rules.
- One bullet per convention, in the imperative, with all evidence removed.
- A rule file with this section filled in no longer matches what agent-stack wrote. Later runs leave it alone, so it stops receiving knowledge-base updates, and taking it back with `--overwrite` or a tick in the approval checklist replaces the whole file, this section included. Say so in Step 5.

Write it like this:
> - Call the API through `src/api/<resource>.ts`, built on the axios instance in `src/api/client.ts`. Components never import axios.

Not like this:
> - The project has 24 API modules and no component imports axios (e.g. `src/api/orders.ts`), so use the API modules.

**settings.json:** for commands run through a container, propose the matching allow rule (e.g. `Bash(docker compose exec -T web pnpm vitest run *)`), and edit only with the user's approval. Allow rules never put `*` before the subcommand.

**Done when:** every approved item is written to its destination, and no general rule was edited.

## Step 5: Report

- What was recorded (file, section, content)
- Conflicts the user has not decided yet
- `AGENTS.md` sections still empty, for the user to fill in
- Notable items with insufficient signal (1 line)
- The rule files written to: before taking one back with `--overwrite` or the approval checklist, review the diff and copy its **Project-specific** section back in
- A reminder to commit `AGENTS.md`, `.claude/rules/vue-*.md` and `.claude/settings.json` so the whole team shares them

---
name: react-infer-conventions
description: Survey a React codebase for the project's real commands, architecture and conventions, then record them in AGENTS.md and the "Project-specific" section of .claude/rules/react-*.md. Use when setting up the template for a new repo, or when asked to detect/document/update project conventions.
disable-model-invocation: true
---

# React Infer Conventions

Record how the project **currently** does things, in the right place. Describe reality; do not improve it.

Inspired by the `infer-conventions` skill from [laravel/boost](https://github.com/laravel/boost).

## Where things go

| Information | Destination |
|---|---|
| Install, dev server, test, lint, typecheck and build commands; package manager; native or through a container; monorepo filter | `AGENTS.md` › Commands & environment |
| Architecture overview: framework and router, folder structure, data-fetching layer, store, layers NOT used | `AGENTS.md` › Code & architecture (a few lines) |
| Details that matter when writing code (API client, form library, component library, styling, test helpers…) | The **Project-specific** section of the matching rule in `.claude/rules/react-*.md` |
| Allow rules for commands run through a container | `.claude/settings.json` |

`AGENTS.md` is always loaded and every AI tool reads it; rules are read only by Claude Code, and a rule with `paths:` is loaded only when working on matching files.

Record each fact in **one** place only. If it is already in `AGENTS.md`, the rules do not repeat it.

Do not fill in the `AGENTS.md` sections that cannot be inferred from code: Workflow, Security, Gotchas. Ask the user in Step 3; if they do not answer, leave them as they are.

## Principles (read before starting)

- **Reality is the standard.** The style used by the majority of the code is the convention, even when a "better" way exists. Do not propose improvements while recording.
- **Record choices, not defaults.** The question for every candidate: *without this line, would Claude write the code differently?* Record it only if the answer is yes. Anything the general rules in the rule files already say is not repeated.
- **Record deliberate absences too.** E.g. "No global store; server data lives in TanStack Query, everything else in component state", so Claude does not add a layer.
- **Architecture matters most**: framework and router, folder structure (by type or by feature), the data-fetching layer, the store, the API client.
- **Evidence is required**: ≥3 consistent examples, with any competing style under ~20%. Otherwise skip it. For commands, the evidence is the CI config, `package.json` scripts, or a successful trial run.
- **Report conflicts; do not pick for the user.** If two styles both have a significant share, ask the user whether a boundary explains them (e.g. old vs. new modules); if not, report it as an unresolved conflict and record nothing.
- **Leave what the tools enforce.** Style that ESLint, Prettier, Biome or `tsconfig` already enforce (per their enabled config) is not recorded.
- **State the convention only**: 1–2 imperative sentences, at most one short syntax snippet. No counts, ratios or lists of evidence files.

## Step 0: Orientation

1. Read `AGENTS.md`, `CLAUDE.md` and every `.claude/rules/react-*.md` file: the general rules (to know what is already the default) and whatever the project has already filled in (skip anything already recorded, unless asked to update it).
2. Read `package.json` (versions; dependencies such as the router, TanStack Query/SWR, Redux/Zustand, React Hook Form, the component library, Vitest/Jest, MSW, Playwright), the lockfile name, `tsconfig*.json`, the bundler/framework config (`vite.config.*`, `next.config.*`), the lint/format config, the test config and setup files, and the CI config.
3. Identify what renders the app (Next.js App Router / Pages Router, React Router/Remix, Vite SPA, CRA) and the React version, and list the top-level folders under `src/` (or `app/`, `components/`, `features/`). Folders beyond the usual (`components`, `pages`/`routes`, `hooks`, `utils`, `assets`) are architectural signals to confirm in Step 2.
4. Determine how commands are run: natively or in a container (`docker-compose.yml`, `Makefile`, `devcontainer.json`), and in a monorepo, how CI targets one package.

**Done when:** you have the list of dependencies, tools, non-standard folders, and how commands are run.

## Step 1: Scan against the checklist

Open `references/checklist.md` and go through every item that applies to the project. For each item, read a few real files (never conclude from grep counts alone), then assign exactly one verdict:

| Verdict | Meaning | Action |
|---|---|---|
| Pattern | Enough evidence; a real choice | Candidate to record, with 2–3 example files |
| Conflict | Two styles both significant | Report with counts and files; ask the user |
| Default | Consistent, but the same as the general rules/React defaults | Skip |
| Insufficient signal | Too few examples, or not used | Skip |
| Tool-enforced / already recorded | Per the principles above | Skip |

On a large project, if a subagent tool is available: split the checklist groups across subagents running in parallel, each returning (item, verdict, evidence, proposed wording, destination file).

**Done when:** every applicable item has exactly one verdict.

## Step 2: Architecture and project quirks

1. For each non-standard folder from Step 0: confirm how it is used (e.g. `features/<name>/` holds that feature's components, hooks and API calls, and features do not import each other), applying the same evidence standard.
2. Look for other codebase-specific traits: a custom render helper or providers wrapper, the API client's error shape, a route-guard component, a permissions hook, a shared page shell. At most ~5 items beyond architecture.

**Done when:** each non-standard folder has a verdict, and the quirks list has at most ~5 items.

## Step 3: Confirm with the user

Present all candidates **at once**, grouped by destination file:

```
### AGENTS.md › Commands & environment
1. [Pattern] pnpm; tests with Vitest. Evidence: pnpm-lock.yaml, .github/workflows/ci.yml.
   Proposed: "One test file: `pnpm vitest run <path>`. Typecheck: `pnpm typecheck`."

### AGENTS.md › Code & architecture
2. [Pattern] Feature folders: src/features/<name>/{components,hooks,api}; no cross-feature imports.
   Proposed: "Code lives in `src/features/<name>/` (components, hooks, api). Features do not import each other; shared code goes in `src/shared/`."

### react-state.md
3. [Pattern] API calls go through src/api/client.ts (axios instance with the auth interceptor).
   Proposed: "Call the API only through the `api` instance in `src/api/client.ts`; never import axios directly."
4. [Conflict] Server data: 14 screens use TanStack Query, 6 copy results into a Redux slice. Is there a boundary?

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

**Rules** (`.claude/rules/react-*.md`):
- Write into the `## Project-specific` section of the destination file, below the section's opening sentence. Do not edit the general rules.
- One bullet per convention, in the imperative, with all evidence removed.
- A rule file with this section filled in no longer matches what agent-stack wrote. Later runs leave it alone, so it stops receiving knowledge-base updates, and taking it back with `--overwrite` or a tick in the approval checklist replaces the whole file, this section included. Say so in Step 5.

Write it like this:
> - Call the API only through the `api` instance in `src/api/client.ts`; never import axios directly.

Not like this:
> - The project has 31 files importing `src/api/client.ts` and 0 importing axios (e.g. `src/features/orders/api.ts`), so use the client.

**settings.json:** for commands run through a container, propose the matching allow rule (e.g. `Bash(docker compose exec -T web pnpm vitest run *)`), and edit only with the user's approval. Allow rules never put `*` before the subcommand.

**Done when:** every approved item is written to its destination, and no general rule was edited.

## Step 5: Report

- What was recorded (file, section, content)
- Conflicts the user has not decided yet
- `AGENTS.md` sections still empty, for the user to fill in
- Notable items with insufficient signal (1 line)
- The rule files written to: before taking one back with `--overwrite` or the approval checklist, review the diff and copy its **Project-specific** section back in
- A reminder to commit `AGENTS.md`, `.claude/rules/react-*.md` and `.claude/settings.json` so the whole team shares them

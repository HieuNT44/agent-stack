---
name: fastapi-review
description: "Checklist review of FastAPI changes (architecture, API contract, DB, security, tests, ops), async or sync. Works on a diff, branch or file. Use whenever the user asks to review, audit or sanity-check FastAPI code or a PR, or before merging FastAPI changes."
---

# FastAPI review

1. Read `.claude/rules/fastapi-*.md` and the project's `AGENTS.md`.
2. Get diff: given PR/range, else `git diff <default-branch>...HEAD` (single commit: `git show HEAD`). Tiny diff (config/const/copy): skip N/A checklist sections; still ask "does this change behavior for all callers?" and "is there a test?". Read changed files **in full context**, not just hunks.
3. Walk checklist. Report only real findings, one line each:
   `path:line: <severity> — problem. fix.` Severity: **BLOCKER** (bug/security/data loss) · **MAJOR** · **MINOR** · **NIT**. Skip pure style that formatter catches.

## Checklist

**Architecture**
- [ ] Layer boundaries: no ORM in controller/service; no HTTP objects in service/repo; inner layers don't import outer
- [ ] Router registered; DI factories thin; no globals/per-request module state

**API contract**
- [ ] `response_model`, status codes, tags; uniform envelope
- [ ] Input constrained; PATCH uses `exclude_unset`; no ORM entity returned
- [ ] Lists paginated + ordered; no breaking change to existing fields

**Async/DB**
- [ ] No blocking call in `async def` (sync SDK, `requests`, `time.sleep`, CPU heavy)
- [ ] No lazy load after await; N+1 absent; bulk where looping writes
- [ ] Transaction owner respected; no commit in repo; no txn held across slow external call
- [ ] Errors caught narrowly, logged with context, re-raised/typed; no bare `except`
- [ ] Missing `await` (coroutine never awaited), un-awaited tasks, `asyncio.gather` error handling

**Security**
- [ ] Auth dep on every route (public ones commented)
- [ ] Ownership/IDOR scope on every lookup & write
- [ ] No mass-assignment; no raw SQL string-building
- [ ] No secrets/PII/tokens in logs or responses; no stack trace leak
- [ ] Upload/URL/outbound call guarded (size, type, timeout, SSRF)

**Tests**
- [ ] Happy, 422, 401, 403/404-other-user, not-found, repo-failure covered
- [ ] Tests deterministic, external services stubbed

**Ops**
- [ ] Config from settings; no new hardcoded values; migrations included & reversible
- [ ] Logs to stdout, no debug leftovers/prints

## Pre-existing issues
Issues in untouched lines of a touched file: list under a separate **Pre-existing** heading (not blocking the verdict) unless the change makes them worse.

## Precedence
If the repo also has its own review skills/agents (`review`, `ai-review`, `code-reviewer`), run those for project-specific rules and this one for the generic checklist; project rules win on conflict.

## Output
Findings sorted by severity, then `Verdict: APPROVE | CHANGES REQUESTED` with 1-line reason. No praise filler.

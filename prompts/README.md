# Prompt log

Record of every prompt sent to the Codex CLI while building this project, and what came back.

## Who did what

- **Prompts:** written by Claude Code (Claude), acting as the prompter and reviewer on the student's behalf.
- **Implementation:** Codex CLI 0.166.0, model `gpt-6.1-terra`, reasoning effort `medium`.
- **Review:** after each Codex run, Claude reads the diff, runs the build, lint and tests, uses the app in a real browser, and sends follow-up prompts for anything that isn't right before the work is committed. Commits and pushes are made by Codex when asked.
- **Parallel chats:** independent work runs in separate Codex sessions (threads) at the same time, split by file ownership defined in `docs/DECISIONS.md`. `runs.tsv` records which thread each turn ran in.

## Files

One set per turn, numbered in the order sent:

- `NN-name.prompt.md` is the exact text sent to Codex.
- `NN-name.response.md` is Codex's final message for that turn.
- `NN-name.events.jsonl` is the full event stream (commands run with their output, file edits, messages). These are kept on the author's disk only and are not committed, because they contain verbatim command output, including course materials.
- `runs.tsv` has the start time, end time, exit status, thread id and sandbox mode of each turn.

## Command used for every turn

```bash
codex exec --ignore-user-config -m gpt-6.1-terra \
  -c 'model_reasoning_effort="medium"' \
  -c 'sandbox_workspace_write.network_access=true' \
  -c 'sandbox_mode="workspace-write"' \
  --json -o NN-name.response.md - < NN-name.prompt.md > NN-name.events.jsonl
```

Follow-ups within the same Codex session use `codex exec resume <thread id>` with the same options. Turns that commit and push stay in the `workspace-write` sandbox but add the repository's `.git` directory as an extra writable root (`-c 'sandbox_workspace_write.writable_roots=["<repo>/.git"]'`), because the sandbox write-protects `.git` by default. Codex never runs unsandboxed. `runs.tsv` marks these turns `sandbox=git`.

## Index

| # | Prompt | Thread | Purpose | Review outcome |
|---|--------|--------|---------|----------------|
| 01 | [prompt](01-spec-review.prompt.md) · [response](01-spec-review.response.md) | A (planning) | Phase 1: review all five specs, explain the architecture, list missing decisions, propose a parallel plan (no code) | Approved. Explained React / Supabase / Postgres roles and the three main flows. Confirmed the four issues raised in the prompt (pre-checked TODO, `/s/:surveyId` vs `/s/:slug`, closed vs not-found under RLS, any-authenticated-user policy) and added several the prompt had not: close/submit race, drafts-only editing to protect historical results, CSV formula injection, no reactivation of closed surveys, unmeasured 200-student target. No files changed. |
| 02 | [prompt](02-decisions-and-contract.prompt.md) · [response](02-decisions-and-contract.response.md) | A (planning) | Record the decisions, write the shared contract for the parallel chats, move and reset TODO.md, add AGENTS.md and .gitignore | Approved with three follow-ups. `docs/DECISIONS.md` pins every RPC (params, JSON, error codes, callers), the shared TypeScript types and data-access signatures, routes, env vars and a file-ownership map. TODO.md moved to the root with 0 of 175 boxes checked, items aligned with the decisions and a submission phase added; `instructions/` otherwise untouched. Follow-ups: the contract blocked students whose browser has no local storage (better to fall back to an in-memory token), CSV header names were inconsistent, and parallel chats would all have edited TODO.md at once. |
| 03 | [prompt](03-plan-fixes-and-commit.prompt.md) · [response](03-plan-fixes-and-commit.response.md) | A (planning) | Apply the three follow-ups, then commit and push | Approved. All three fixes present (in-memory token fallback, `survey_title`/`response_id`/`submitted_at` headers, chats no longer edit TODO.md). Commit `cae1f7e` contains exactly the requested files and `main` matches `origin/main`. The first attempt to start this turn with an unsandboxed Codex was refused by Claude Code's safety check, so commit turns now run in the normal sandbox with only `.git` added as writable. |
| 04 | [prompt](04-scaffold.prompt.md) · [response](04-scaffold.response.md) | B (scaffold, "chat A" in the contract) | Wave 1, parallel with 05: Vite/React/TS/Tailwind scaffold, shared types, data-access layer, auth, router, shared UI components, placeholder pages | Approved after follow-ups (turn 06). Reviewer reran build, lint and tests (all pass) and `npm audit --omit=dev` (0 vulnerabilities; the 10 Codex mentioned are dev-only). Types and `api.ts` match the contract exactly; login redirect-back, not-configured screen and FORBIDDEN message are in place. Review found: the projector page wrapped in the instructor header, N+1 requests in `listSurveys` (one count per survey) and `getSurvey` (one per question), malformed UUIDs surfacing as UNEXPECTED_ERROR, the confirm dialog always red, and code with no blank lines at all. |
| 05 | [prompt](05-database.prompt.md) · [response](05-database.response.md) | C (database, "chat B" in the contract) | Wave 1, parallel with 04: migration, RLS, all RPCs, seed, SQL Editor check script, Supabase setup README, Docker test harness | Logic approved; formatting not (turn 07). Reviewer reran `supabase/tests/run_local.sh` against a throwaway PostgreSQL 17 container: 59 of 59 checks PASS (anon blocked from every table and every instructor RPC, non-instructor FORBIDDEN, full lifecycle, duplicates, results). Code review: no direct table writes for anyone, `security definer` functions with an empty `search_path` and an instructor check, Supabase's default execute grants revoked, an advisory lock serializing activate/close, and a `FOR SHARE` lock so a submission cannot commit after close. Problems: every `create table` was a single 300-400 character line, the functions put several statements on one line, there was no token length limit, and the concurrency behaviour was not actually tested. |

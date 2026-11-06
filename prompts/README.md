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

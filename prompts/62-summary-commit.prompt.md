that answers all seven, thanks. one fix: in the database section, "I assigned the instructor role to my account and the grader's" isn't right, codex ran that SQL for me. say codex assigned it with the update documented in supabase/README.md.

then run prettier and commit and push: docs/DEVELOPMENT_SUMMARY.md and prompts/ (my log) only. there's an untracked prompts.zip in the repo root, leave it alone and don't stage it. check git diff --cached --stat first, nothing from .env* or any .events.jsonl. message something like "Answer each development summary question directly" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

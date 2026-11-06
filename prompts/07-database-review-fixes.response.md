Reformatted the migration, seed, stub, and SQL checks, with comments explaining the security model and locks. Added the 128-character anonymous-token limit to both the table constraint and submission RPC.

The Docker-only [concurrency checks](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/tests/concurrency_checks.py) now verify that close waits for an open submission, a later submission is rejected, and concurrent activations serialize with exactly one survey active.

Verification:

- `supabase/tests/run_local.sh` — **62 SQL checks and 6 concurrency checks passed**. The throwaway container was removed.
- `npm run build` — passed.
- `npm run lint` — passed.

The newly verified TODO items are the database lifecycle and duplicate-submission tests, including concurrent closure and activation, plus the token constraint and boundary checks. No files outside `supabase/` were edited, and no commit was made.
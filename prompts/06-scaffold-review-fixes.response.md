The shared frontend fixes are in place:

- The protected presentation route renders without the instructor header.
- Survey reads use embedded response counts and nested questions and choices. The top-level list remains paginated, and detail reads fall back to pagination if embedded rows are truncated.
- Malformed IDs return `NOT_FOUND` for instructor survey reads and RPCs.
- `ConfirmDialog` accepts `confirmVariant` and `busy`; busy dialogs disable both buttons and ignore Escape.
- Shared files have purpose comments and more spacing, and [AGENTS.md](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/AGENTS.md) now includes the requested style rule.

Prettier, the build with placeholder environment values, lint, and all 5 tests passed. The new test covers malformed IDs across the instructor API calls. The embedded queries and dialog behavior still need verification against a live database and in a browser.

For the TODO checklist, this work reverified the successful build; it did not complete any additional feature boxes. `TODO.md` and `supabase/` were untouched, and no commit was made.
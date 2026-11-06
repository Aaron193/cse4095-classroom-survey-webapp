Built the database work under `supabase/`:

- [Initial migration](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/migrations/20261105000000_initial_schema.sql) with the five tables, RLS, RPCs, validation, indexes, and lifecycle locks.
- [Example seed](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/seed.sql), [SQL Editor checks](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/tests/rls_checks.sql), Supabase stub, and [Docker test runner](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/tests/run_local.sh).
- [Setup instructions](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/supabase/README.md) for project creation, migration, instructor setup, and checks.

Verification run:

- `supabase/tests/run_local.sh` — **59 checks passed** against a throwaway PostgreSQL 17 container; the container was removed.
- `npm run build` — passed.
- `npm run lint` — passed.

The checks cover role restrictions, public lookup, submissions and validation errors, lifecycle operations, duplication, results, and export. The locking implementation was exercised through lifecycle checks, but concurrent transactions and a real Supabase project have not yet been tested.

The following TODO items are verified locally at the database level: all five tables, foreign keys, indexes, timestamps and status validation; RLS and instructor authorization; public lookup and anonymous submission; atomic draft saving and drafts-only editing; activation, automatic closure and one-active enforcement; slug generation; duplicate-token protection; results counts and percentages; duplication; and database unauthorized-access checks. Creating the actual Supabase project remains outstanding. No commit was made.
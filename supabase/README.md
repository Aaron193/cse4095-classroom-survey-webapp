# Supabase setup

1. Create a project in the Supabase dashboard and wait for its database to finish provisioning. Keep all passwords and privileged keys out of this repository.
2. In **SQL Editor**, open a new query, paste the complete contents of `migrations/20261105000000_initial_schema.sql`, and run it once. Then run `seed.sql` in a separate query for an example draft. The seed is optional and is not idempotent.
   - CLI alternative: install and authenticate the Supabase CLI, run `supabase link --project-ref YOUR_PROJECT_REF` from the repository root, then `supabase db push`. This applies migrations; run `seed.sql` separately in the SQL Editor if desired. Linking and pushing target the selected remote project, so verify the project reference first.
3. In **Authentication → Providers → Email**, disable new user signups (the dashboard may label this “Allow new users to sign up”). Save the setting. Create the instructor administratively in **Authentication → Users**, using **Add user** and an email/password supplied privately. Do not store the credentials here.
4. Copy that user's UUID from the dashboard. In the SQL Editor, replace the placeholder below with that UUID and run the statement. It preserves other application metadata. Only an administrator should perform this step; `app_metadata` is trusted for authorization.

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || '{"role":"instructor"}'::jsonb
   where id = 'INSTRUCTOR_USER_UUID'::uuid;
   ```

5. Sign the instructor out and sign in again (or refresh the session) to obtain a JWT containing the updated `app_metadata.role` claim. The database checks this trusted claim on every instructor RPC and RLS read.
6. Paste all of `tests/rls_checks.sql` into the SQL Editor and run it as the SQL Editor's administrative database role. Its final result has one PASS/FAIL row per check. It creates test data inside a transaction and rolls it back, including any temporary lifecycle changes to existing surveys. Temporary session objects remain only for the editor session. Inspect any FAIL or NOT RUN result before relying on the setup.

To repeat the isolated PostgreSQL 17 test locally with Docker, run `supabase/tests/run_local.sh` from the repository root. It creates a disposable container, applies `tests/supabase_stub.sql`, the migration and seed, runs the SQL checks and separate-session concurrency checks, and removes the container on exit. The stub models only the Supabase roles, JWT helpers, pgcrypto schema, and default grants needed here; it is not a replacement for testing on a real Supabase project. The script exits nonzero on SQL errors or failed checks.

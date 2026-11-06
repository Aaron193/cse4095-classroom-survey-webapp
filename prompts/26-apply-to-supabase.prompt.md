the real supabase project is up. the public URL and publishable key are in .env.local, and the connection string and the instructor login are in .env.db.local at the repo root (SUPABASE_DB_URL, INSTRUCTOR_EMAIL, INSTRUCTOR_PASSWORD). never print the connection string or the password, don't copy them into any file in the repo, and keep them out of your final message.

1. apply the migration to the real project. psql isn't installed on this machine, so use the psql inside the postgres:17 docker image (with --network host) or whatever else works. don't run seed.sql, I want the real surveys to come from the app.
2. give the instructor account the instructor role with the update from supabase/README.md, matched on INSTRUCTOR_EMAIL, and check that exactly one row was updated.
3. run supabase/tests/rls_checks.sql against the real project and show me the results. everything should pass, and nothing should be left behind afterwards, so check that all five tables are empty when it's done.
4. run npm run verify:rls with the instructor env vars loaded (node --env-file or similar) and show me the output.
5. if any step in supabase/README.md didn't work the way it's written (the pooler, the SQL editor, the dashboard labels, anything), fix the README.

don't edit TODO.md, no commits.

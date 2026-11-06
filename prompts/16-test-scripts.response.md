Implemented [verify-rls.mjs](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/scripts/verify-rls.mjs) and [load-test.mjs](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/scripts/load-test.mjs), with the requested npm commands. No new dependency was needed.

Run the load test with `npm run load-test -- --yes`; add `--cleanup` to delete its survey or `--count=100` to change the default of 200 submissions. Activating the test survey closes any currently active survey.

Verified:

- Both scripts parse and exit with a clear error when Supabase configuration is missing.
- Prettier, lint, and build pass.
- The real-project checks have not been run. The RLS script’s insert probes use invalid IDs to avoid leaving data behind, and update/delete probes target random IDs; those checks alone cannot prove that valid writes are blocked.
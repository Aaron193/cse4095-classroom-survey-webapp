the database is live now (the database chat applied the migration and everything passed, including verify:rls). before we run the load test for real, a few changes to scripts/load-test.mjs:

1. make it more like an actual class. right now it does one get_public_survey and then fires 200 submits. instead, each simulated student should load the survey with get_public_survey and then submit, all of them at the same time. have each student pick random choices, keep a tally of what was sent, and check that get_survey_results matches that tally exactly for every choice, not just that the totals add up. also check that get_survey_export comes back with one row per submission.
2. delete the test survey by default when it's done so it doesn't clutter the dashboard, and add a --keep flag for when someone wants to look at it. if something fails halfway through it should still close and delete it.
3. it's really hard to read right now: one big try block with basically no blank lines. split it into a few small functions with blank lines and short comments, like AGENTS.md says. do the same for verify-rls.mjs if it needs it (but don't change what it checks).

then run it against the real project with the instructor env from .env.db.local. same rules as before: never print the password or the connection string, keep them out of the repo and out of your final message. run it with the default 200 and show me the full output, then confirm all five tables are empty again afterwards. if 200 at once fails or is slow, tell me exactly what failed and the error message, don't just lower the number.

run lint and prettier. no TODO edits, no commits.

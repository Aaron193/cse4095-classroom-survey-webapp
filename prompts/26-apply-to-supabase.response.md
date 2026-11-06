The real project is set up: the migration was applied without the seed, and the instructor role was assigned to exactly one account. The SQL checks returned **62/62 PASS**.

After the checks, all five tables were empty:

| Table | Rows |
|---|---:|
| surveys | 0 |
| questions | 0 |
| choices | 0 |
| responses | 0 |
| answers | 0 |

`npm run verify:rls` used a temporary draft for the instructor-results check. It passed every check, and the draft was deleted afterward:

```text
PASS anon select surveys
PASS anon select questions
PASS anon select choices
PASS anon select responses
PASS anon select answers
PASS anon RPC save_draft
PASS anon RPC duplicate_survey
PASS anon RPC activate_survey
PASS anon RPC close_survey
PASS anon RPC archive_survey
PASS anon RPC delete_survey
PASS anon RPC get_survey_results
PASS anon RPC get_survey_export
PASS unknown public survey
PASS anon insert surveys
PASS anon insert questions
PASS anon insert choices
PASS anon insert responses
PASS anon insert answers
PASS anon update surveys
PASS anon delete surveys
PASS anon update questions
PASS anon delete questions
PASS anon update choices
PASS anon delete choices
PASS anon update responses
PASS anon delete responses
PASS anon update answers
PASS anon delete answers
PASS instructor list surveys
PASS instructor read results
```

The database connection and documented role-update SQL worked; I did not use the dashboard or SQL Editor, so their current labels and workflow remain unverified. No README change was needed based on the steps exercised, and no commit was made.

Verified TODO items include the five tables, constraints and indexes; RLS and instructor authorization; anonymous access restrictions; public lookup and submission; lifecycle and duplicate-response checks; and results calculations on the real project.
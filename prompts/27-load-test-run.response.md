The live test passed with **200 concurrent students**. Each loaded the survey, selected random choices, and submitted. The results matched every choice tally, the export contained 200 rows, and the duplicate submission was rejected.

Full test output:

```text
WARNING: Activating this test survey closes the currently active survey.
Submissions: 200 succeeded, 0 failed.
Student load + submission latency (ms): min 349.4, median 2308.2, p95 4033.0, max 4300.7.
PASS response count and exact choice tallies
PASS export contains 200 response rows
PASS duplicate submission rejected
Deleted test survey bbbfaf8a-72c9-4f3e-8475-7b14c4478e49.
```

Afterward, exact counts confirmed that all five tables were empty: surveys, questions, choices, responses, and answers each had **0 rows**.

Updated [load-test.mjs](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/scripts/load-test.mjs) to delete the test survey by default; `--keep` retains it. Prettier, lint, and build passed. No commit was made.
thanks, that's exactly what I wanted, and the two-client check is a good proof. I looked after you finished and there are no sessions or refresh tokens left in auth. commit and push it: only scripts/verify-rls.mjs, scripts/load-test.mjs and prompts/ (my log). stage only those paths and check git diff --cached --stat first. message something like "Sign out test scripts locally so browser sessions survive" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

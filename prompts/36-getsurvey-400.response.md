Fixed `getSurvey` by giving the question and choice data embeds distinct aliases from their count embeds, including in the pagination fallback. Signed-in users visiting `/login` are now redirected to their original destination or the dashboard.

The live instructor check returned the requested draft unchanged, with zero responses and these questions in order:

1. **What is required for recursion?** — A base case; A pointer; A loop; A compiler
2. **Every recursive function needs a stopping condition.** — True; False

I also forced the embedded results to one row per level and verified that both pagination fallbacks returned the complete ordered data. The fallback remains necessary: PostgREST documents that its maximum row limit applies to embedded resources as well. [PostgREST changelog](https://github.com/PostgREST/postgrest/blob/main/CHANGELOG.md)

Build, lint, Prettier, and all 23 tests passed. The login redirect has not been checked in a browser. The TODO item verified is **“Verify the project builds successfully”**; the live check also verifies the survey read used for editing, though not the full editor workflow. No TODO edits or commits were made.
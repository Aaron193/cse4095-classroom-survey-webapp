that fixed it, the new query parses fine against the live project (anon now gets 42501 instead of PGRST108). one more thing I saw in the browser: the confirm dialog opens stuck in the top-left corner of the screen instead of centered. I think tailwind's preflight sets margin: 0 on everything, which removes the browser's default margin: auto that centers a modal dialog. please fix that in the dialog rule in src/style.css.

then two commits, pushed after each:
1. src/lib/api.ts and src/pages/LoginPage.tsx plus prompts/ (my log), something like "Fix survey loading and redirect signed-in users from login", with a short body mentioning the PGRST108 error.
2. src/style.css, something like "Center the confirmation dialog".

run build, lint, tests and prettier first. stage only the paths for each commit and check git diff --cached --stat before each one. end both messages with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

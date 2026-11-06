everything of yours works on the live site now. last thing for your files: a few of them have no blank lines at all, which makes them hard to read: src/pages/LoginPage.tsx, src/pages/LandingPage.tsx, src/types/survey.ts, src/main.tsx, and the tests in src/lib/. please do the AGENTS.md readability pass on those: blank lines between logical blocks and short comments where something isn't obvious. no behaviour changes.

run build, lint, tests and prettier. no TODO edits, no commits.

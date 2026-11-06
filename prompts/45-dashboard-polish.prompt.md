tested the dashboard on the live site and everything works: filters, activate with the warning, close, duplicate, archive, and delete with the response count. one small inconsistency: the Close confirmation on the dashboard uses the normal primary button, but the projector page's Close confirmation is red. closing can't be undone (closed surveys can't be reactivated), so please make the dashboard one use the danger style too.

also the AGENTS.md readability pass on DashboardPage.tsx: blank lines between logical blocks and short comments where it isn't obvious. no other behaviour changes.

run build, lint, tests and prettier. no TODO edits, no commits.

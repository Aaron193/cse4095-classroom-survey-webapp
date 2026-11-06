you're the dashboard chat from docs/DECISIONS.md. three other chats are working in this same working tree at the same time (survey editor, student page, present + results), so only edit src/pages/DashboardPage.tsx and files under src/components/dashboard/. read AGENTS.md and docs/DECISIONS.md first. use the shared stuff that's already there (src/lib/api.ts, src/types/survey.ts, src/auth, src/lib/publicUrl.ts and the components in src/components/ui) instead of calling supabase directly or making your own versions. if you really need a change in a shared file, don't make it, tell me what and why.

build the dashboard from UI.md section 4 and TODO phases 4 and 10:

- the page already sits inside InstructorLayout (app name, email, logout). add the "Dashboard" heading and a New Survey button.
- load with listSurveys and show each survey as a card: title, status badge, created date (like "Aug 17, 2026") and response count.
- actions depend on status. draft: edit, activate, duplicate, archive, delete. active: present, results, close. closed: results, duplicate, archive, delete. archived: results, duplicate, delete.
- activate: confirm first, and if another survey is active the confirm should say that one will be closed. after activating, go to the present page.
- close and archive need a confirm. delete needs one too, with a stronger warning when the survey has responses (something like "this permanently deletes N responses", and suggest archiving instead).
- duplicate goes straight to the editor for the new copy.
- search by title, a status filter (all / draft / active / closed / archived) and a created-date range filter. "No surveys match your search." when the filters hide everything, and the "You have not created any surveys yet." empty state with a Create Your First Survey button when there are none.
- loading state, friendly errors from AppError (including the not-an-instructor case), buttons disabled while an action is running (use the dialog's busy prop), and the list reloads after each action. if an action fails, show the error and keep the list usable.
- cards stack on mobile and the action buttons wrap. use real links for the navigation actions and buttons for the rest, with accessible names that include the survey title (like aria-label "Delete Recursion Check").

there's no supabase project connected yet, so you can't test with real data. put the filtering/sorting and the "which actions does this status get" logic in pure functions and add vitest tests for them. run build, lint, tests and prettier. don't edit TODO.md. at the end tell me what you built, how you verified it, and which TODO boxes you think are verified. no commits.

you're the survey editor chat from docs/DECISIONS.md. three other chats are working in this same working tree at the same time (dashboard, student page, present + results), so only edit src/pages/SurveyEditorPage.tsx and files under src/components/editor/. read AGENTS.md and docs/DECISIONS.md first and use the shared stuff (saveDraft / getSurvey / activateSurvey / listSurveys in src/lib/api.ts, src/types/survey.ts, src/components/ui). don't change shared files; if you need something in one, tell me.

build the editor from UI.md section 5 and TODO phase 5. the same page handles /surveys/new and /surveys/:id/edit.

- title and optional description fields.
- questions: each one has its text, a type select (Multiple Choice / True / False) and its choices. a new survey starts with one empty multiple choice question with two empty choices so it's ready to type in. add question button at the bottom.
- multiple choice choices can be added, removed and reordered. true/false shows the fixed True and False choices read-only. switching the type keeps the question text, and switching back to multiple choice brings back the choices they had typed.
- reorder questions with move up / move down buttons (keyboard friendly, keep focus on the moved item). delete questions and choices; ask for confirmation before deleting a question that has text in it.
- validation per the contract, shown right next to the field that's wrong: title required, at least one question, question text required, multiple choice needs at least 2 non-blank choices and no duplicates (case insensitive, after trimming). also a short summary at the top when saving is blocked. the server runs the same rules on save and activate.
- Save Draft calls saveDraft. for a new survey, replace the URL with /surveys/<id>/edit. after saving, reload from the server since question ids change. show "Saving..." then "Saved", and disable the buttons while saving.
- Activate saves first, then calls activateSurvey and goes to the present page. if another survey is currently active, confirm first and say it will be closed (listSurveys tells you).
- if the survey isn't a draft, don't show the form. say only drafts can be edited, with links to its results and back to the dashboard, and mention duplicating it to make changes.
- loading state for existing surveys, a not found state, and friendly errors from AppError.
- warn before leaving with unsaved changes (beforeunload is fine).
- one column, works on a phone, labels connected to inputs.

put the editor state changes, the validation and the conversion to DraftInput in pure functions with vitest tests. no supabase project yet, so you can't test against real data. run build, lint, tests and prettier. don't edit TODO.md. at the end tell me what you built, how you verified it, and which TODO boxes you think are verified. no commits.

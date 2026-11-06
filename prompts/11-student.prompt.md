you're the student page chat from docs/DECISIONS.md. three other chats are working in this same working tree at the same time (dashboard, survey editor, present + results), so only edit src/pages/StudentSurveyPage.tsx and files under src/components/student/. read AGENTS.md and docs/DECISIONS.md first and use the shared api, types and components. don't change shared files; if you need something in one, tell me.

this is the most important page, students open it on their phones from the QR code (UI.md sections 7 and 8, TODO phases 7 and 8):

- /s/:slug loads with getPublicSurvey. states: loading ("Loading survey..."), not found ("Survey not found."), closed (the title + "This survey is no longer accepting responses."), the form, submitting, success ("Thank you!" / "Your response has been recorded."), already submitted ("You have already submitted a response to this survey."), and an error state with a Try Again button for network problems.
- no login, no menu, no nav. just the title, description, numbered questions and their choices. one column, big readable text.
- each choice is a real radio input where the whole row is clickable, at least 44px tall with space between them. the submit button spans most of the screen width.
- every question is required. if something is unanswered on submit, mark those questions right next to them and move focus to the first one.
- anonymous token per the contract: crypto random, created once per browser and kept in localStorage, with an in-memory fallback if storage isn't available. also remember locally which surveys this browser already submitted, so a student who reopens the link sees "already submitted" right away instead of the form.
- submit with submitSurveyResponse. DUPLICATE_RESPONSE shows already submitted, SURVEY_NOT_ACTIVE shows the closed message, network errors keep their answers and let them retry, and anything else gets a friendly generic message. never show raw errors.
- disable the button and show "Submitting..." while it runs, and guard against double taps.
- accessible: a fieldset and legend per question, visible focus, works with just a keyboard.
- set the browser tab title to the survey title.

put the token/storage logic and the answer validation in pure functions with vitest tests (mock localStorage, including the case where it throws). no supabase project yet, so you can't test against real data. run build, lint, tests and prettier. don't edit TODO.md. at the end tell me what you built, how you verified it, and which TODO boxes you think are verified. no commits.

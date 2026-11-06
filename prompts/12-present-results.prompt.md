you're the present + results + CSV chat from docs/DECISIONS.md. three other chats are working in this same working tree at the same time (dashboard, survey editor, student page), so only edit src/pages/PresentSurveyPage.tsx, src/pages/ResultsPage.tsx and files under src/components/present/ and src/components/results/. read AGENTS.md and docs/DECISIONS.md first and use the shared api, types, components and src/lib/publicUrl.ts. don't change shared files; if you need something in one, tell me.

present page (UI.md section 6, TODO phase 6). it renders without the instructor header since it goes on the projector:
- load the survey with getSurvey. for an active survey: big title, a large QR code of the public URL (qrcode package), the URL in big readable text under it, and the response count, which polls getResponseCount every 5 seconds while the tab is visible (pause when hidden, clean up the timer).
- buttons: View Results, Close Survey (confirm first, then go to the results page), Download QR Code (PNG named after the survey) and a Fullscreen toggle, plus a small way back to the dashboard.
- designed for a projector: minimal chrome, huge QR, high contrast, fills a 16:9 screen nicely, and still usable on a laptop screen.
- if the survey isn't active, don't show a QR. say it isn't active and link to the results and the dashboard.

results page (UI.md section 9, TODO phases 9 to 11):
- header with the title, status badge and "N responses".
- per question: every choice with its count and percentage as text, plus a horizontal bar chart (recharts). it has to be readable without relying on color, so the numbers are always printed. "No responses yet. Display the QR code so students can join." when there are none.
- buttons: Refresh, Export CSV, Present QR (only while active) and Back to Dashboard.
- works for closed and archived surveys too.
- CSV export with getSurveyExport, exactly per the contract: survey_title, response_id, submitted_at, then one column per question with the question text as the header and the choice text as the values. standard quoting, formula neutralization, a UTF-8 BOM so excel opens it right, and a filename with the survey title and today's date.

put the CSV building, the chart data shaping and anything else that's logic in pure functions with vitest tests (quotes, commas, newlines, formula prefixes, zero responses, unicode). no supabase project yet, so you can't test against real data. run build, lint, tests and prettier. don't edit TODO.md. at the end tell me what you built, how you verified it, and which TODO boxes you think are verified. no commits.

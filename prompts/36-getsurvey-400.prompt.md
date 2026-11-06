found a real bug while testing the live site in the browser: getSurvey fails every time, so editing an existing draft, the presentation page and the results page are all broken. saving a new draft works (the save_draft rpc returns 200), but the getSurvey call right after it comes back 400 and the editor shows "Something went wrong. Please try again."

the request is GET /rest/v1/surveys?select=...,questions_total:questions(count),questions(...,choices_total:choices(count),choices(...))&questions.order=position.asc,id.asc&questions.choices.order=position.asc,id.asc and postgrest answers:

{"code":"PGRST108","message":"'choices' is not an embedded resource in this request","hint":"Verify that 'choices' is included in the 'select' query parameter."}

it looks like the questions.order / questions.choices.order paths get matched to the (count) embeds of the same tables instead of the real ones. the fallback query on questions breaks in a different way: ordering choices next to choices_total:choices(count) gives 42803 "column "choices_1.position" must appear in the GROUP BY clause or be used in an aggregate function".

you can reproduce both without logging in. postgrest reports these errors before it checks table privileges, so a curl with just the publishable key from .env.local shows them (a query that's fine comes back 42501 for anon instead). I used survey id 47cd979f-8bc3-4c98-ae96-136169615473, a real draft I just made.

please fix getSurvey so it works against the real project. as far as I know postgrest's max-rows limit only applies to top-level rows, not embedded ones, so check whether the truncation fallback is needed at all. if it is, make it work without breaking the ordering. the unit test mocks supabase so it couldn't catch this, so verify against the live project: sign in with the instructor env from .env.db.local in a small throwaway node script (same secret rules as before, and don't save the script in the repo) and show me the query returning that survey with its 2 questions and their choices in order. don't change the draft.

small one while you're in there: if you're already signed in and open /login, it still shows the login form. it should send you on to the dashboard (or to the page you came from).

run build, lint, tests and prettier. no TODO edits, no commits.

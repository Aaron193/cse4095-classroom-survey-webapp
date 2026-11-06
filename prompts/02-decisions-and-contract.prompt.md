nice, that's a really useful review and I agree with almost all of it. here's what I decided on the open questions:

- the student route is /s/:slug. the slug gets generated the first time a survey is activated and never changes after that. 8 random lowercase letters/digits (skip lookalikes like 0/o/1/l) is plenty.
- add get_public_survey(p_slug) like you said. it returns active plus the survey, questions and choices; closed with just the title so the page isn't blank; or not_found. archived counts as closed.
- instructor auth: public signups get disabled in supabase and I create the instructor account from the dashboard. on top of that, the database checks for an instructor role in the user's app_metadata (role = "instructor"), which only an admin can set. so an is_instructor() helper that every instructor policy and RPC uses. I'd rather not add a 6th table for this.
- only drafts can be edited, in the UI and enforced in the db. closed surveys can't be reactivated (UI.md's closed card doesn't have activate anyway), you duplicate them instead. archive works on drafts and closed surveys. delete works on anything that isn't active, with a stronger warning when it has responses.
- all questions are required. true/false is stored as two fixed choices, "True" and "False", that can't be edited. multiple choice needs at least 2 non-blank choices and no duplicate choice text within a question.
- saving in the editor goes through one RPC that replaces the draft's questions and choices in a single transaction. drafts can never have responses, so delete-and-reinsert is fine and we don't need to keep the old ids.
- no realtime for now. the results page has a refresh button and the present page polls the response count every few seconds.
- percentage = choice count / number of answers to that question, 1 decimal, 0 when there are no answers.
- CSV: one rectangular table so it opens cleanly in excel/sheets. leading columns for survey title, response id and submitted_at, then one column per question with the question text as the header. escape commas/quotes/newlines, neutralize cells that start with = + - @, and leave out the anonymous token.
- the QR code / public URL uses an optional VITE_PUBLIC_SITE_URL and falls back to window.location.origin, so I can point it at my laptop's LAN address when I test with my phone.
- we'll do a small load test later (something like 200 concurrent submissions against the RPC) instead of just claiming the 200 student target.

for the parallel plan: chat A does the scaffold and all the shared stuff (deps, router, tailwind, supabase client, shared types, typed data-access functions for every RPC and query, auth provider + protected route + login page, shared UI components, placeholder pages for every route) while chat B does everything under supabase/ at the same time. once both are done, four chats go in parallel: dashboard, survey editor, student page, and present + results + CSV. each of those only touches its own page/component files and uses the shared data-access functions.

so for this turn please write these (still no app code):

1. docs/DECISIONS.md with every decision above, the other ones from your review, and the full contract that chat A and chat B will both build against: exact RPC names, params, return JSON and error codes, which roles can call each one, the TypeScript type names and which file they live in, the data-access function names and signatures, the route list, env var names, and a file ownership map for the 4 later chats. make it specific enough that two chats that never talk to each other build things that fit together.
2. move instructions/TODO.md to TODO.md at the repo root, since that's the checklist I keep updated (the other spec files stay where they are, untouched). uncheck every box because nothing is done yet, adjust items that conflict with the decisions (like /s/:surveyId), and add a final phase for the submission stuff: README, development summary, AI history, database screenshots, and a way for the grader to use the instructor login without credentials in the repo.
3. AGENTS.md with working rules for every chat: DECISIONS.md is the contract; instructions/ is read-only; prompts/ is my prompt log so don't touch it; no secrets anywhere in the repo; several chats share this working tree, so stay inside your assigned files; no commits unless I ask, and then only stage your own files; tick TODO boxes only after actually verifying; run build and lint before saying you're done.
4. a .gitignore for a vite/node project. ignore .env and .env.* except .env.example, plus prompts/*.events.jsonl (raw logs that stay on my machine).

give me a short summary of what you wrote when you're done. no commits yet.

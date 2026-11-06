looks good. three small changes before we commit:

1. DECISIONS.md: if local storage isn't available, don't block the student. use an in-memory token for that page load so they can still submit (the db unique constraint still applies to that token), and just note that duplicate protection won't survive a reload in that case.
2. DECISIONS.md: make the CSV leading column headers survey_title, response_id and submitted_at so they're consistent.
3. TODO.md ownership: when the 4 page chats run at the same time they shouldn't all be editing TODO.md. change DECISIONS.md and AGENTS.md so chats don't edit TODO.md unless I ask. they list the boxes they verified in their final message and I'll get them ticked after I review.

then commit and push to origin main. stage TODO.md, the removal of instructions/TODO.md, docs/, AGENTS.md, .gitignore and prompts/ (the .gitignore already keeps the events files out) and check git status to make sure nothing else got staged. commit message something like "Plan: decisions, contract and reset TODO" with a short body, and end it with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

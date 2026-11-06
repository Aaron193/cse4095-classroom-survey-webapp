tested the editor on the live site and it works: validation, reordering, save, and activate with the warning about the active survey. two keyboard things:

1. after "+ Add choice" or "+ Add question", focus stays on the button. move it to the new choice input or the new question's text field, like the move buttons already do.
2. when save or activate fails validation, focus stays on the button. move it to the first invalid field (the student page already does this).

also the AGENTS.md readability pass on SurveyEditorPage.tsx: blank lines between logical blocks and short comments where it isn't obvious. no other behaviour changes.

run build, lint, tests and prettier. no TODO edits, no commits.

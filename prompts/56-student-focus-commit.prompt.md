checked it on the dev server: keyboard submit lands on "Thank you!", a stale second tab gets "Already submitted" with focus on the heading, and a normal load of an already-submitted survey leaves focus alone. commit and push it: only src/pages/StudentSurveyPage.tsx and prompts/ (my log). the test-scripts chat is editing scripts/ right now, so stage only those paths and check git diff --cached --stat first. message something like "Move focus to the student end state after submitting" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

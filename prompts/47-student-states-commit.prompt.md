looks good. one tweak: the not-found state now says "Survey not found" in the heading and "Survey not found." again right under it. keep the heading and make the line under it useful, something like "Check the link, or ask your instructor for the current one."

then run build, lint, tests and prettier, and commit and push: only src/pages/StudentSurveyPage.tsx plus prompts/ (my log). other chats are committing right before and after you, so stage only those paths and check git diff --cached --stat first. message something like "Make the student end states consistent" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

good. two small things in ResultsPage.tsx before committing: the new comment "Release the temporary object URL after starting the download." ended up above link.download instead of above URL.revokeObjectURL, so please move it. and revoking the URL synchronously right after link.click() can cancel the download in some browsers (older Safari and Firefox), so revoke it in a setTimeout instead.

then run build, lint, tests and prettier, and commit and push: only src/pages/ResultsPage.tsx, src/pages/PresentSurveyPage.tsx and prompts/ (my log). other chats are committing right before and after you, so stage only those paths and check git diff --cached --stat first. message something like "Clarify empty results for closed surveys" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

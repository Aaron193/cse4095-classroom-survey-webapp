the hidden category axis is the right fix, thanks. two things before we commit:

1. the new test makes npm test fail on any machine without google-chrome. I tried it with CHROME_BIN pointing at nothing and got "spawn /nonexistent ENOENT". whoever grades this might run npm test without chrome, so please make it skip with a clear message when no chrome binary is found, and keep it running when chrome is there.
2. ResultsBarChart uses the new responsive prop with a 100% style, and ResultsPage still wraps it in ResponsiveContainer. pick one way of sizing it so it isn't doing both.

then run build, lint, tests and prettier, and commit and push: only src/pages/ResultsPage.tsx, src/components/results/ and prompts/ (my log). stage only those paths and check git diff --cached --stat first. message something like "Draw the result bars" with a short body, ending with this trailer line:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

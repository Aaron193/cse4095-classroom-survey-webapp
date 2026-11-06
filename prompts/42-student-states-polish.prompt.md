tested the student page on the live site and on a real phone, and it works well. one polish thing: the "already submitted" and "survey not found" states are just a line of small text at the top, while "thank you" has a heading and "closed" shows the survey title. please make all the end states look consistent (a heading plus a short line, same layout as the thank-you state), keeping the wording from UI.md.

also, StudentSurveyPage.tsx is hard to scan. please add blank lines between logical blocks and short comments where the behaviour isn't obvious, like AGENTS.md says. no behaviour changes apart from the layout above.

run build, lint, tests and prettier. no TODO edits, no commits.

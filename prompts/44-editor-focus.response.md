Updated [SurveyEditorPage.tsx](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/src/pages/SurveyEditorPage.tsx) so adding a question or choice focuses its new input. Failed validation now focuses the first invalid field; when a question or choice is missing entirely, it focuses the relevant add button. I also added spacing and comments for readability.

Build, lint, Prettier, and all 26 tests passed. The new keyboard behavior has not been checked in a browser yet.

Verified items: question and choice validation remains covered by the existing tests, and the editor builds and passes lint. No TODO edits or commits were made.
did a keyboard-only pass on the student page at phone width on the live site. tab into each question, arrow keys and space to pick, tab to submit, enter: all good, and the focus ring on submit is clear.

one gap: after pressing enter, the form gets replaced by "Thank you!" and focus falls back to the body, so a screen reader user hears nothing about the submission going through. same thing when the submit ends in "Already submitted" or the closed message. can you move focus to the heading of whichever end state the page lands on after a submit (tabIndex -1 on the heading is fine)? don't steal focus on a normal page load, only after a submit attempt. the validation and error paths already work (focus on the first unanswered question, role="alert" for errors), leave those alone.

stay in your files (src/pages/StudentSurveyPage.tsx and src/components/student/). run build, lint, tests and prettier. no TODO edits, no commits.

a few things on the presentation page I noticed reading through it before the browser pass:

1. if one poll fails (say the wifi blips in the lecture hall), the error shows at the top of the page and never goes away, even after the next polls work again. a failed poll shouldn't look like the page broke. show a small note near the count, something like "couldn't update the count, retrying", and clear it as soon as a poll succeeds. keep the big error for when the survey itself can't be loaded.
2. the fullscreen error sticks around forever the same way.
3. if the survey stops being active while it's up on the projector (closed from the dashboard in another tab, or another survey got activated, which closes this one), the page keeps showing the QR code and students who scan it just get "closed". can the poll notice that and switch to the "this survey isn't active" view? getSurvey already returns status and response_count, so using it in the poll is fine (it's one instructor, every 5 s). don't change src/lib/api.ts though, that's the scaffold chat's file.

run build, lint, tests and prettier. no TODO edits, no commits.

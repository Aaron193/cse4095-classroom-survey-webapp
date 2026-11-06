another one from the live site. I had the presentation page open while your last two commits were deploying, then clicked "← Dashboard" and the whole app went blank. the console said:

TypeError: Failed to fetch dynamically imported module: https://cse4095-classroom-survey-webapp.pages.dev/assets/InstructorLayout-CvfwWO3R.js

the new deploy doesn't have that old chunk anymore, and because of the SPA fallback, pages answers the old chunk url with index.html (200, text/html) instead of a 404, so the import fails. this will happen to anyone who has the app open during a deploy, like an instructor in the middle of class.

please:
1. handle it the way the vite docs suggest: listen for vite:preloadError and reload the page so the browser picks up the new build. guard it so it can't get stuck in a reload loop if a chunk really is missing (for example only reload once within some time window; sessionStorage is fine for that).
2. there's no error boundary at all, so any render error gives a blank white page. add one near the top that shows a short "something went wrong" message with a reload button instead.

test 1 locally, e.g. with vite preview: load a page, make the next route's chunk disappear from dist, then navigate to that route. run build, lint, tests and prettier. no TODO edits, no commits.

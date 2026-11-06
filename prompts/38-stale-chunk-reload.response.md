Added guarded recovery for `vite:preloadError`: the app reloads at most once per minute per tab. If the chunk is still unavailable, or session storage is blocked, a top-level error boundary shows a message and reload button.

I tested a production build in Chrome through Vite preview, removing the login chunk after the landing page loaded. Navigation caused one automatic reload, then showed the error boundary while the chunk remained missing. After restoring it, the reload button returned to the login page. The test used request interception to relay preview responses to Chrome.

Build, lint, Prettier, and all 25 tests passed. The verified TODO item is **“Verify the project builds successfully.”** No commit was made.

[Vite recommends](https://vite.dev/guide/build#load-error-handling) serving the HTML with `Cache-Control: no-cache` so a reload picks up the latest build; that response header still needs verification on the deployed site.
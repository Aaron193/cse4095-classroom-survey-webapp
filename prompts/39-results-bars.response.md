Fixed the results bars by adding a hidden category Y axis. Counts and percentages remain visible as text.

Added a fixed-size rendering test that verifies a 37.5% bar draws at 150 pixels in a 400-pixel chart. The test requires `google-chrome` on the PATH or a `CHROME_BIN` environment variable.

Build, lint, Prettier, and all 26 tests passed. The rendering test verifies the Phase 9 bar-chart behavior; the live page still needs a browser check after deployment. I did not edit `TODO.md` or create a commit.
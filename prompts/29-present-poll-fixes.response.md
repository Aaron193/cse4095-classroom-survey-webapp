Updated the presentation page so failed polls show a small retry note near the count, which clears on the next successful poll. Polling now also checks survey status and switches to the inactive view if the survey closes elsewhere. Fullscreen errors are separate and dismissible, and clear after a successful fullscreen change.

Build, lint, Prettier, and all 23 existing tests passed. The new behavior still needs the planned browser pass; no new browser tests were added.

No TODO items were verified as complete by these checks. I did not edit `TODO.md` or create a commit.
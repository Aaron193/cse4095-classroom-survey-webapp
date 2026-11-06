Updated both scripts to use `signOut({ scope: "local" })`, with a comment explaining why.

Verified against the live project that two instructor clients could sign in, the second could refresh its session and read surveys after the first signed out locally, and the second could then sign out locally. Prettier, lint, and build passed. No commit was made.
# Working rules

- `docs/DECISIONS.md` is the shared implementation contract. Resolve contract conflicts with the user before changing it; the current assignment takes precedence over older specifications.
- `instructions/` is read-only. `prompts/` is the user's prompt log: do not modify it.
- Never put secrets, passwords, service-role keys, access tokens, or real credentials anywhere in the repository, including documentation and logs.
- Multiple chats share this working tree. Stay within the files assigned to your workstream; coordinate changes to shared files with their owner. Do not overwrite others' work.
- Do not commit unless the user asks. If asked, stage only your own files and inspect what is staged.
- Do not edit `TODO.md` unless the user asks. List the checklist items you actually verified in your final message so the user can review them.
- Run the build and lint before saying your implementation work is done. Report any failure or unavailable command honestly.

- Keep code readable: use blank lines between functions and logical blocks, add short comments for non-obvious behavior, avoid giant one-liners, and run Prettier before finishing.

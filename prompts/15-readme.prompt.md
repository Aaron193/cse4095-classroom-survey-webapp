you're the docs chat. read AGENTS.md, docs/DECISIONS.md, TODO.md, supabase/README.md and the assignment handout in instructions/instructions.txt (section 7 says what the README needs). other chats are working in this tree at the same time, so only create/edit README.md at the repo root.

write the README for the project:
- what the app is and the main features for the instructor and the students, plus the tech stack
- architecture: how the react app, supabase auth, postgres/RLS and the RPC functions fit together, and how data moves in the main flows. keep it short, a small diagram in a text code block is nice
- the database: the five tables and how they relate, the status lifecycle, and the security model (anon only gets the two public RPCs, the instructor role lives in app_metadata, all writes go through RPCs). link to supabase/README.md for the setup steps instead of repeating them
- local setup: prerequisites, npm install, .env.local from .env.example, npm run dev, and testing on a phone (VITE_PUBLIC_SITE_URL + vite --host)
- scripts: dev, build, lint, format, test, preview, and supabase/tests/run_local.sh for the docker database checks
- deployment to cloudflare pages from github: build command, output directory, the env vars, SPA routing, and setting VITE_PUBLIC_SITE_URL and the supabase auth site URL to the production domain. leave placeholders for the live URL, I'll fill it in after deploying
- grader access: the instructor test credentials are given privately in the HuskyCT submission and are never in the repo
- the project structure as a tree, and links to docs/DECISIONS.md, TODO.md, instructions/ (the provided specs) and prompts/ (the AI development history)

keep it accurate to what's actually in the repo right now. check the files, don't invent scripts or features that don't exist. no secrets. don't edit TODO.md, no commits.

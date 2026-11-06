ok so for my agentic programming class I have to build and deploy a classroom survey web app. the instructor logs in, makes multiple choice / true-false surveys and activates one, students scan a QR code and answer without logging in, and the instructor looks at the results. the assignment handout is instructions/instructions.txt and the 5 spec docs are in instructions/ too: Classroom_Survey_Web_App_Specification.md, TODO.md, DATABASE.md, API.md and UI.md. the stack is react + typescript + vite + tailwind on the frontend, supabase (postgres, auth, RLS) for the backend and database, and cloudflare pages for hosting.

before we write any code, please read all of them and then:

1. explain the architecture back to me. what do the react app, supabase and the database each do, and how does data move between them in the main flows (instructor creates and activates a survey, student opens the QR link and submits, instructor views results)?
2. list anything that's missing, ambiguous or contradictory in the specs that we need to make a call on, with what you'd recommend for each. a few I noticed:
   - TODO.md already has most of its boxes checked even though there's no code yet
   - TODO.md uses /s/:surveyId but UI.md and API.md use /s/:slug
   - if RLS only lets anon users read active surveys, how does the student page tell "closed" apart from "not found"?
   - DATABASE.md gives full access to any authenticated user. what stops someone from signing up with the public anon key and getting instructor access to everything?
3. propose an implementation plan. I want to split the work across a few chats running in parallel so this goes faster, so group it into workstreams that can run at the same time without editing the same files, and tell me what has to be agreed on up front (RPC names and signatures, shared types, routes, etc) so the chats stay compatible with each other.

don't write code or change any files yet, I just want the review and the plan first.

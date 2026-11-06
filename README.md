# Classroom Survey Web App

A classroom polling app where an instructor creates and presents surveys and students answer without accounts. The instructor can create and edit draft multiple-choice and true/false questions, activate one survey at a time, present a QR code and link, monitor response counts, view results, export CSV, duplicate surveys, and archive or delete surveys. Students open the link or scan the QR code, answer the required questions, and receive confirmation. A browser token helps prevent accidental repeat submissions.

The frontend uses React, TypeScript, Vite, React Router and Tailwind CSS, with Recharts for charts and `qrcode` for QR codes. Supabase provides authentication, PostgreSQL, row-level security (RLS), and database functions.

Live application: **<production URL>**

## Architecture and data flow

```text
Instructor browser ── sign in ──> Supabase Auth
        │                          │ JWT with instructor app_metadata
        └── React app ─────────────┴──> Postgres: RLS reads + instructor RPCs
Student browser ── React app ──> public RPCs ──> Postgres tables
```

The instructor signs in, saves a draft through an RPC, and activates it. Activation closes any existing active survey and creates a public slug. The presentation page builds a link and QR code for that slug. A student loads the active survey through `get_public_survey` and submits answers and a browser token through `submit_survey_response`; the database validates and stores the submission atomically. Instructor results and CSV data are retrieved through instructor RPCs. Results refresh on request; the presentation response count polls while the page is visible.

## Database and security

The five tables use UUID keys and foreign keys:

- `surveys` contains survey metadata and status; a survey has many questions and responses.
- `questions` belongs to a survey and has many choices.
- `choices` belongs to a question.
- `responses` belongs to a survey and represents one submission.
- `answers` belongs to a response and identifies a question and its selected choice.

A survey starts as `draft`, can become `active`, then `closed`; drafts and closed surveys can be `archived`. Only drafts can be edited or activated. A closed survey can be duplicated into a new draft. Archiving preserves responses; deleting a non-active survey permanently cascades to its related records. At most one survey is active at a time.

RLS is enabled on all five tables. Anonymous clients have no direct table access; their survey access is through the two public RPCs, `get_public_survey` and `submit_survey_response`. The instructor role is stored in trusted Supabase Auth `app_metadata`, checked by the database for instructor reads and RPCs. All application writes go through RPCs, which enforce authorization, lifecycle rules, and validation. The browser token prevents accidental duplicates in the same browser, not deliberate repeat submissions or submissions from another device.

See [supabase/README.md](supabase/README.md) for database setup, instructor provisioning, and database checks.

## Local setup

Prerequisites: Node.js and npm compatible with the installed Vite version, and a configured Supabase project. Docker is needed only for the local database checks.

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your project's URL and public anon key. Optionally set `VITE_PUBLIC_SITE_URL` to the absolute HTTP(S) URL students should use. Do not put a service-role key or instructor credentials in these files.
3. Run `npm run dev` and open the local URL printed by Vite.

To test on a phone on the same network, set `VITE_PUBLIC_SITE_URL` in `.env.local` to a phone-reachable URL such as `http://<computer-LAN-IP>:5173`, then start Vite with `npm run dev -- --host`. Open that URL on the phone or scan the generated QR code. Restart Vite after changing environment variables. If `VITE_PUBLIC_SITE_URL` is empty, links use the browser's current origin.

## Scripts and checks

| Command                       | Purpose                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                 | Start the Vite development server.                                      |
| `npm run build`               | Type-check and build the production app into `dist/`.                   |
| `npm run lint`                | Run ESLint.                                                             |
| `npm run format`              | Run Prettier on the configured source and configuration files.          |
| `npm test`                    | Run the Vitest suite once.                                              |
| `npm run preview`             | Preview the production build locally.                                   |
| `supabase/tests/run_local.sh` | Run isolated PostgreSQL checks in Docker, including concurrency checks. |

## Deploy to Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages and configure:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PUBLIC_SITE_URL` set to the production app's absolute URL, for example `https://<production-domain>`.

Set the Supabase Auth **Site URL** to the production domain as well. `public/_redirects` provides the SPA fallback so routes such as `/s/:slug` load on direct visits. After deploying, verify login, QR links, submissions, results, and a direct visit to a student link on the production domain.

Production URL: **<production URL>**

## Grader access

Instructor test credentials are provided privately in the HuskyCT submission and are never stored in this repository.

## Project structure

```text
.
├── docs/                  # Shared implementation decisions
├── instructions/          # Provided assignment and specifications
├── prompts/               # AI development history
├── public/                # Static assets and SPA redirect
├── src/
│   ├── auth/              # Authentication and route protection
│   ├── components/        # Shared and feature-specific UI and logic
│   ├── lib/               # Supabase client, API and utilities
│   ├── pages/             # Instructor and student routes
│   └── types/             # Survey and API types
├── supabase/
│   ├── migrations/        # Database schema, policies and functions
│   ├── tests/             # Database and concurrency checks
│   ├── README.md          # Supabase setup
│   └── seed.sql           # Optional example draft
├── .env.example           # Environment variable placeholders
├── package.json
└── TODO.md                # Project checklist
```

See [docs/DECISIONS.md](docs/DECISIONS.md) for the implementation contract, [TODO.md](TODO.md) for the checklist, [instructions/](instructions/) for the provided specs, and [prompts/](prompts/) for the AI development history.

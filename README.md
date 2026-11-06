# Classroom Survey Web App

A classroom polling app where an instructor creates and presents surveys and students answer without accounts. The instructor can create and edit draft multiple-choice and true/false questions, activate one survey at a time, present a QR code and link, monitor response counts, view results, export CSV, duplicate surveys, and archive or delete surveys. Students open the link or scan the QR code, answer the required questions, and receive confirmation. A browser token helps prevent accidental repeat submissions.

The frontend uses React, TypeScript, Vite, React Router and Tailwind CSS, with Recharts for charts and `qrcode` for QR codes. Supabase provides authentication, PostgreSQL, row-level security (RLS), and database functions.

Live application: [https://cse4095-classroom-survey-webapp.pages.dev](https://cse4095-classroom-survey-webapp.pages.dev)

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

Prerequisites: Node.js `^20.19.0` or `>=22.12.0`, npm, and a configured Supabase project. Docker is needed only for the local database checks.

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
| `npm run verify:rls`          | Check access controls against the configured Supabase project.          |
| `npm run load-test`           | Run simulated student loads and submissions against Supabase.           |
| `supabase/tests/run_local.sh` | Run isolated PostgreSQL checks in Docker, including concurrency checks. |

The two Supabase scripts use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local` or the environment. Provide `INSTRUCTOR_EMAIL` and `INSTRUCTOR_PASSWORD` as environment variables for the instructor checks and load test. For example, place those two values in a private `.env.scripts.local` file, which is gitignored, and run:

```sh
node --env-file=.env.scripts.local scripts/verify-rls.mjs
node --env-file=.env.scripts.local scripts/load-test.mjs --yes
```

Without instructor credentials, `verify:rls` skips its instructor checks. The load test activates its own survey, closing any currently active survey, and requires `--yes` to acknowledge this. It deletes its survey afterwards unless `--keep` is passed. The equivalent npm command is `npm run load-test -- --yes` when the credentials are already in the environment; add `--keep` after `--yes` to retain the test survey.

## Testing

In November 2026, the Vitest suite passed 26 of 26 tests. The SQL checks passed 62 of 62 both in the local Docker harness and on the live Supabase project; the local Docker harness also passed 6 of 6 concurrency checks. On the live project, `verify:rls` passed 31 of 31 checks.

A manual pass on the deployed site in desktop Chrome covered instructor creation, validation, saving, reordering, activation and its existing-active-survey warning, presentation with the live count, closing, duplication, archiving, status filtering, and deletion with the response-count warning. It also covered student validation, submission, already-submitted, closed, and not-found states. A real phone submission was made by scanning the QR code.

A second pass checked the student page in a 390 px phone-width frame and with keyboard-only navigation. A WCAG contrast check of every text element on the landing, login, dashboard, editor, presentation, results, and student pages found none below 4.5:1 (or 3:1 for large text). The pass also checked results refresh, the date filter, archiving and viewing archived results, and logout. A CSV made by the app's exporter containing commas, quotes, line breaks, non-ASCII text, and formula-like values opened correctly in LibreOffice Calc 24.2, with no formulas evaluated.

A live-project load test sent 200 simulated students from one machine to load the survey and submit simultaneously, with zero failures. Time from loading the survey to confirmed submission was 349 ms minimum, 2.3 s median, 4.0 s at the 95th percentile, and 4.3 s maximum. These measurements describe that run, not a general capacity guarantee.

## Deploy to Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages and configure:

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `NODE_VERSION=22`.

`VITE_PUBLIC_SITE_URL` is optional and can be left unset in production. The QR code and link then use the address from which the instructor opened the page, normally the production URL on Cloudflare Pages. Set it to an absolute HTTP(S) URL when students need a different address, such as the LAN address used for phone testing.

Set the Supabase Auth **Site URL** to the production domain as well. Cloudflare Pages serves `index.html` for unknown paths when the build has no top-level `404.html`, allowing direct visits to routes such as `/s/:slug`. Do not add a top-level `404.html`, which disables this SPA fallback. After deploying, verify login, QR links, submissions, results, and a direct visit to a student link on the production domain.

Production URL: [https://cse4095-classroom-survey-webapp.pages.dev](https://cse4095-classroom-survey-webapp.pages.dev)

## Screenshots

The Supabase Table Editor screenshots show a test survey with two questions, six choices, four responses, and eight answers. Anonymous tokens are blurred and no email is shown.

- [Tables and survey](docs/screenshots/01-database-tables-and-surveys.jpg)
- [Questions](docs/screenshots/02-database-questions.jpg)
- [Choices](docs/screenshots/03-database-choices.jpg)
- [Responses](docs/screenshots/04-database-responses.jpg)
- [Answers](docs/screenshots/05-database-answers.jpg)
- [Results in the app](docs/screenshots/06-results-in-app.jpg)

## Grader access

A separate grader account has the instructor role. Its credentials are provided privately in the HuskyCT submission; no grader email or credentials are stored in this repository.

## Project structure

```text
.
├── docs/                  # Decisions, development summary and screenshots
├── instructions/          # Provided assignment and specifications
├── prompts/               # AI development history
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

See the [development summary](docs/DEVELOPMENT_SUMMARY.md) for the project process and review, [docs/DECISIONS.md](docs/DECISIONS.md) for the implementation contract, [TODO.md](TODO.md) for the checklist, [instructions/](instructions/) for the provided specs, and [prompts/](prompts/) for the AI development history.

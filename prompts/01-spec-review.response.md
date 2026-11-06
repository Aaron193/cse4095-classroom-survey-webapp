I read the handout and all five specifications. The design is workable with a React app talking directly to Supabase; it does not require a separate custom application server. The main decisions to settle before parallel implementation are **instructor authorization, survey lifecycle and historical-data rules, and the exact database/API contracts**.

## 1. Architecture and data flow

**React** provides the screens and interaction: instructor login and survey management, the projected QR page, the student form, and results and CSV export. It runs in each user’s browser. Cloudflare Pages hosts the built frontend and serves it at a public URL.

**Supabase** provides authentication and the APIs the browser calls. Supabase Auth signs the instructor in and supplies a session. The Supabase JavaScript client sends requests to Supabase’s database API, including calls to PostgreSQL functions, often called *RPCs*. The public Supabase URL and anon key belong in frontend configuration; they identify the project but do not grant instructor privileges by themselves.

**PostgreSQL** stores the data and enforces integrity and access rules. The five tables connect surveys to questions and choices, and responses to individual answers. Row Level Security (RLS) restricts what each caller can access. Database constraints and functions should enforce rules that must hold even when someone bypasses the React interface.

The main flows are:

1. **Create and activate.** The instructor signs in through Supabase Auth. React uses the authenticated session to create a draft survey, its questions, and choices in PostgreSQL. On activation, React calls an instructor-only database function that validates the survey, closes any currently active survey, and activates the selected one in a transaction. React constructs the public URL from the deployed site’s origin and the survey slug, then generates the QR code.

2. **Open and submit.** A student scans the QR code and opens `/s/:slug`. React asks Supabase for the public survey and renders its questions and choices; the student has no account. On submission, React sends the survey ID, a browser-held anonymous token, and selected choices to a database function. The function checks that the survey is still active, validates the complete set of answers and duplicate token, and saves the response and answers atomically. React then shows confirmation.

3. **View results.** An authenticated instructor opens the results page. React requests instructor-only counts and choice totals, displays counts, percentages and charts, and can fetch the underlying response data for CSV export. The data remains in PostgreSQL after a page refresh or browser session ends.

## 2. Decisions and spec issues

These are my recommended decisions to document before implementation:

- **Checklist accuracy.** [TODO.md](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/instructions/TODO.md) marks implementation and deployment work complete. Treat those boxes as unverified, not evidence of completed work. Once implementation begins, reconcile them against the actual repository and services, and update them as work is verified.

- **Student route.** Use `/s/:slug`, as specified in [API.md](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/instructions/API.md) and [UI.md](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/instructions/UI.md). `surveyId` and `slug` are route parameter names, but the important contract is that the path value is the public slug, not necessarily the database UUID. Generate a unique, hard-to-guess slug on first activation and retain it thereafter.

- **Closed versus not found.** You are right: an anonymous query governed by active-only RLS cannot distinguish those cases. Add a narrowly scoped public lookup RPC returning either the active survey, `closed`, or `not_found`; for a known inactive slug it should return only the status, never questions or results. This intentionally reveals that a guessed slug exists, so use sufficiently random slugs. Define draft/archived behavior too: I recommend returning `closed` for a previously issued slug that is no longer active.

- **Instructor authorization.** The example policy granting every authenticated user full access is unsafe if public signup or another way to obtain an authenticated session is available. For this single-instructor assignment, disable public signup and provision the instructor account administratively **and** make RLS and privileged RPCs check an explicit instructor allowlist or trusted server-managed role. Test with an ordinary authenticated non-instructor account as well as an anonymous user. A protected React route is only a UI convenience, not a security boundary; never put a service-role key in the app.

- **Submission permissions and consistency.** [DATABASE.md](/home/dev/Desktop/college/senior/sem1/cse4095/classroom-survey-web-app/instructions/DATABASE.md) mentions anonymous inserts but also recommends an RPC. Grant students execution of the validated submission function rather than direct writes to `responses` and `answers`. Enforce one answer for every question, membership of each question and choice, no repeated questions, and a nonempty token. Use a transaction and a unique `(survey_id, anonymous_token)` constraint. Coordinate closing and submission with database locking so a submission cannot slip through after the close operation completes.

- **Duplicate protection is limited.** A random token in local storage prevents common accidental repeat submissions in the same browser. Clearing storage, using another browser or device, or deliberately changing the token bypasses it. This meets the handout’s *reasonable protection against accidental duplicates*, not identity verification. Define a friendly recovery path if local storage is unavailable.

- **Editing and historical results.** The handout specifies editing drafts, while TODO says active surveys must first be closed, which could imply editing a closed survey. Editing or deleting questions and choices after responses exist can change or erase historical results under the proposed cascades. I recommend **editing drafts only**; to reuse or change a closed survey, duplicate it into a new draft. Enforce that rule in the database as well as the UI.

- **Lifecycle details.** Agree that activation validates at least one complete question; automatically closes the existing active survey; and allows a draft to become active. Closing changes active to closed. Archive closed or draft surveys, with confirmation; delete permanently with a strong warning. I recommend duplicating a closed/archived survey for another class rather than reactivating it: otherwise old and new responses and duplicate tokens are mixed together. The one-active constraint must be enforced in the database, including concurrent activation attempts.

- **Question rules.** Make every question required, since the student UI and submission errors assume that. Require a nonblank title and question text, at least one question, and at least two nonblank choices for multiple choice. Represent true/false as a question with exactly two stored choices, “True” and “False,” so submission and results use the same model. Agree on ordering and whether duplicate choice text is permitted.

- **Results, refresh, and percentages.** The overview calls responses live, while TODO defers live-updating charts. Use an explicit results refresh for MVP; refresh the projected response count periodically while the page is open, so it is useful during class without requiring Realtime. Define percentage as choice count divided by the number of answers to that question, with zero displayed for a zero denominator. The supplied sample SQL should be reviewed before use: its grouping/order and historical integrity need validation.

- **CSV scope.** API.md describes one row per response; TODO additionally asks for survey metadata. Use a documented format containing survey metadata plus a response table with timestamp and a column per question. Define escaping for commas, quotes and newlines, and protect spreadsheet users from formula-like cell values. Do not include the anonymous browser token.

- **Scale and deployment.** The spec targets 200 simultaneous students and a sub-two-second average page load, but does not define test conditions or guarantee free-tier capacity. Test a representative concurrent submission workload and record the results rather than promising those targets without measurement. Cloudflare must serve the React entry point for deep links such as `/s/:slug`; production QR links must use the deployed origin.

## 3. Parallel implementation plan

Start with a short **contract and scaffold phase** owned by one chat. Record the decisions above, create the project skeleton and shared interfaces, and assign file ownership. Other chats can prepare designs or isolated work while that happens, but should not independently invent shared APIs.

Agree on these contracts up front:

| Contract | Proposed agreement |
|---|---|
| Routes | The routes in UI.md; public route `/s/:slug`. Instructor pages use the internal survey UUID. |
| Shared model | Survey statuses `draft`, `active`, `closed`, `archived`; question types `multiple_choice`, `true_false`; ordered questions and choices; all questions required. |
| Auth | Provisioned instructor plus explicit server-side authorization; public signup disabled. |
| Public lookup | `get_public_survey(p_slug text)` returns a documented discriminated result: `active` with survey data, `closed`, or `not_found`. |
| Submission | `submit_survey_response(p_survey_id uuid, p_anonymous_token text, p_answers jsonb)` with `{question_id, choice_id}` entries; returns a documented success shape and stable error codes. |
| Lifecycle | `activate_survey(p_survey_id uuid)` and `close_survey(p_survey_id uuid)`, with documented return shapes, authorization and error codes. |
| Results | An instructor-only `get_survey_results(p_survey_id uuid)` returning the shape in API.md; agree separately on the response-detail query used for CSV. |
| Editor persistence | Agree on an atomic save operation and exact payload for a survey with its ordered questions and choices, including IDs for existing records. This avoids partial saves and preserves identity. |
| Frontend boundary | Shared TypeScript types, a single Supabase client, and typed data-access functions; specify exports and file paths before page work begins. |
| Integration | One owner for dependencies, router, global styles, environment variable names, and shared types. Other chats request changes through that owner. |

Suggested workstreams after that contract is written:

1. **Database and security:** Own `supabase/` migrations and database-level tests. Implement schema, constraints, RLS, instructor authorization, lifecycle, public lookup, submission and results functions. Provide setup instructions and verify anonymous, non-instructor and instructor access.

2. **Instructor management:** Own instructor dashboard and editor page components in assigned files. Implement creating, editing drafts, duplication, status actions and validation against the agreed data-access interface. Use mock adapters until the database functions are available.

3. **Student experience:** Own the public survey page and its local components. Implement mobile layout, lookup states, browser token, validation, submission and confirmation against the agreed interface.

4. **Presentation and results:** Own the projection and results pages and their local components. Implement QR generation and PNG download, response count, charts, refresh and CSV export against the agreed interface.

5. **Integration owner:** Own the scaffold, `package.json`, router, shared types/client/data-access layer, auth provider, shared styles, README and deployment configuration. Integrate the other streams, resolve contract changes, and run end-to-end testing. This role can be the coordinating chat rather than an additional parallel chat.

To keep the chats compatible, give each its assigned paths and the same written contract, and have only the integration owner edit shared files. Each stream should report any needed contract changes before making them. After integration, test the complete lifecycle, unauthorized access and RLS, concurrent activation/submission, duplicate behavior, mobile QR flow, CSV, persistence, and the deployed deep links. Finally, update the checklist and prepare the handout’s required README, development summary, AI history, database screenshots and a private way for the grader to access the instructor account.

No files were changed.
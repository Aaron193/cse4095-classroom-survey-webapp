# Classroom survey decisions and implementation contract

This document is the binding contract for the scaffold (chat A), database (chat B), and later page workstreams. The handout and remaining files in `instructions/` supply requirements where this document is silent. Record any agreed contract change here before dependent work begins. This is a single-instructor deployment; multiple instructors, courses, and Realtime are future work.

## Product and lifecycle

- Statuses are `draft`, `active`, `closed`, and `archived`. Only drafts can be edited or activated. Activation atomically closes any existing active survey, validates and activates the target, and creates its slug if absent. Closed surveys cannot be reactivated: duplicate them as drafts. Archive drafts or closed surveys; delete any non-active survey after confirmation, with a stronger warning if it has responses. Archive preserves responses; delete cascades permanently. Confirm close and archive too. The database enforces these rules, including against direct calls and concurrent operations. At most one survey is active globally, enforced by a partial unique index and serialized lifecycle operations.
- A slug is generated on first activation and never changes: eight cryptographically random characters from `23456789abcdefghijkmnpqrstuvwxyz` (no `0`, `o`, `1`, or `l`); retry collisions. `/s/:slug` is the public route. A previously issued slug for a closed or archived survey returns its title and `closed`; an unknown slug returns `not_found`. A draft without a slug is not public. Do not expose inactive questions, choices, or results.
- Drafts have no responses. Saving replaces all questions and choices atomically, so their IDs may change. A survey needs a nonblank title, at least one question, nonblank question text, and at least two nonblank choices per multiple-choice question. Duplicate choice text within a question is forbidden after trimming and case-insensitive comparison. True/false has exactly the fixed choices `True`, `False` in that order; these are not editable. All questions are required. Trim stored title, question and choice text; trim optional description and store an empty description as null. Positions are consecutive zero-based integers according to array order. Apply the same validation on save and activation; incomplete work can remain in the browser until valid enough to save.
- Students do not log in. A random browser token in local storage and a unique `(survey_id, anonymous_token)` constraint prevent accidental repeat submissions, not deliberate evasion or multiple devices. Generate a sufficiently random token once per browser, retain it across surveys, and send it on every submission. If local storage is unavailable, use an in-memory token for that page load so the student can still submit. Duplicate protection for that token does not survive a reload; the database uniqueness constraint still applies. The database rejects empty tokens and invalid, duplicate, missing, or cross-survey answers. A submission is all-or-nothing. Closing and submission use compatible locks: once close completes no later submission can commit for that survey.
- No Realtime in MVP. Results refresh on request; the projection page polls counts every 5 seconds while visible and cleans up its timer. Percentages are `count / number of answers to that question * 100`, rounded to one decimal; return zero when the denominator is zero. Show counts and percentages without relying on color. Required answers mean normal complete submissions have one answer per question, but calculations must tolerate zero or incomplete legacy data.
- CSV is one rectangular table: `survey_title`, `response_id`, `submitted_at`, then one column per question headed by question text; one row per response, choice text as each answer. Do not export the browser token. Escape commas, quotes and newlines using standard CSV quoting; neutralize cells beginning with `=`, `+`, `-`, or `@` by prefixing an apostrophe. Preserve headers and leading columns even for zero responses. Warn before permanent deletion and preserve historical data until deletion.
- QR and readable link use `VITE_PUBLIC_SITE_URL` when nonempty, otherwise `window.location.origin`; normalize trailing slashes. It must be an absolute HTTP(S) origin/base URL reachable by students. Provide downloadable PNG. Cloudflare Pages must serve the SPA on deep links. Test a representative 200-concurrent-submission workload later; do not claim unmeasured capacity or load times.

## Security and execution

Disable public signup in Supabase and create the instructor administratively. An authenticated user's trusted `app_metadata.role` must equal `instructor`. Implement `public.is_instructor()` using the verified JWT's app metadata, returning false for missing claims. Every instructor RLS policy and every instructor RPC checks it; UI route guards are not authorization. Document how an administrator assigns the role and signs in again/refreshes the session after a claim change. No extra instructor table. Test anonymous users and authenticated non-instructors as well as instructors. Never expose service-role credentials in frontend code, repository, or logs.

Enable RLS for all five tables. Do not grant anonymous direct inserts into responses/answers or reads of responses/answers. Public access is through the two public RPCs below; grant only the needed function execution and revoke unintended default `PUBLIC` execution. Instructor reads may use RLS-protected table queries, but mutations use the RPCs below so lifecycle and draft restrictions cannot be bypassed. Restrict direct instructor table writes accordingly. Harden any `SECURITY DEFINER` functions with a fixed safe search path, fully qualified objects, explicit authorization, minimum privileges, and validation; do not trust caller-supplied role or IDs. Avoid returning raw database errors or sensitive data to students.

PostgreSQL tables are `surveys`, `questions`, `choices`, `responses`, `answers`, following DATABASE.md, with UUID primary keys, timestamps, foreign keys, ordering indexes, unique slug, unique answer per response/question, non-null token, and cascade behavior consistent with deletion. Enforce answer membership across survey/question/choice in the submission RPC, and question and choice positions in the save RPC. Treat the example SQL in DATABASE.md as illustrative, not authoritative over this contract.

## Wire format and errors

RPCs use the `public` schema and JSON/JSONB results described below. JSON keys are snake_case exactly as written. All timestamps are ISO 8601 strings, IDs are UUID strings, and nullable fields are explicitly null. Arrays are always present and ordered by `position`. A successful mutation returns its stated JSON object; failed mutations raise a PostgreSQL exception whose message is exactly one of the stable codes below. The client maps the message to `AppError`; it must never show raw exceptions to students. Network or unexpected database errors map to `NETWORK_ERROR` or `UNEXPECTED_ERROR`. No partial mutations on errors.

Common codes: `AUTH_REQUIRED` (no authenticated identity), `FORBIDDEN` (authenticated but not instructor), `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`, `SURVEY_NOT_ACTIVE`, `DUPLICATE_RESPONSE`, `INVALID_QUESTION`, `INVALID_CHOICE`, `MISSING_REQUIRED_ANSWER`, `NETWORK_ERROR`, `UNEXPECTED_ERROR`. Auth checks precede instructor resource lookup. For anonymous submission, nonexistent and inactive IDs both produce `SURVEY_NOT_ACTIVE`. Reject duplicate question entries as `INVALID_QUESTION`; an answer with a question not belonging to the survey is `INVALID_QUESTION`; a missing or mismatched choice is `INVALID_CHOICE`; absent required questions are `MISSING_REQUIRED_ANSWER`. Empty or malformed payload/token is `INVALID_INPUT`. Use `INVALID_STATE` for forbidden transitions or attempted edits/deletes of an active or non-draft survey as applicable. Unique token conflicts map to `DUPLICATE_RESPONSE`.

### JSON structures

```text
SurveySummary = { id, title, description, status, public_slug, created_at, updated_at, response_count }
SurveyDetail = SurveySummary + { questions: Question[] }
Question = { id, survey_id, question_text, question_type, position, choices: Choice[] }
Choice = { id, question_id, choice_text, position }
DraftInput = { title, description, questions: DraftQuestionInput[] }
DraftQuestionInput = { question_text, question_type, choices: string[] }
AnswerInput = { question_id, choice_id }
PublicSurvey = { id, title, description, questions: Question[] }
SurveyResults = { survey_id, title, response_count, questions: [{ question_id, question_text, response_count, choices: [{ choice_id, choice_text, count, percentage }] }] }
ExportData = { survey_id, title, questions: [{ question_id, question_text }], responses: [{ response_id, submitted_at, answers: [{ question_id, choice_text }] }] }
```

In `DraftInput`, choices for true/false must be exactly `["True", "False"]`; the server verifies this. The server derives positions from array order. Public survey IDs are necessary for submission and do not grant access to results. `response_count` is an integer and counts submissions; result question `response_count` counts answers for that question. The export uses survey question order and responses ordered by submission time then ID; answers can be matched by question ID. Do not return tokens in export.

## RPC contract

All RPC parameter names below are exact Supabase RPC argument keys. `anon` means anonymous role; `authenticated` means signed-in role. Public functions are executable by both roles so a signed-in instructor can test the student link. Instructor functions are executable by `authenticated` only and must independently check `is_instructor()`.

| RPC and parameters | Caller | Successful JSON | Behavior / expected errors |
| --- | --- | --- | --- |
| `get_public_survey(p_slug text)` | anon, authenticated | `{ "status": "active", "survey": PublicSurvey }`, `{ "status": "closed", "title": string }`, or `{ "status": "not_found" }` | Exact slug lookup; no inactive content. Invalid/unknown slug returns `not_found`. |
| `submit_survey_response(p_survey_id uuid, p_anonymous_token text, p_answers jsonb)` | anon, authenticated | `{ "success": true, "response_id": uuid }` | `p_answers` is an array of `AnswerInput`. Validate and insert atomically; submission errors above. |
| `save_draft(p_survey_id uuid, p_draft jsonb)` | instructor | `{ "survey_id": uuid }` | Null `p_survey_id` creates a draft; otherwise replaces an existing draft's title, description, questions and choices atomically. `p_draft` is `DraftInput`. `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`. |
| `duplicate_survey(p_survey_id uuid)` | instructor | `{ "survey_id": uuid }` | Copy metadata/questions/choices into a new draft titled `Copy of <original title>`; no slug or responses. Source may have any status. `NOT_FOUND`. |
| `activate_survey(p_survey_id uuid)` | instructor | `{ "id": uuid, "status": "active", "public_slug": string }` | Only draft; validate complete content, generate slug and close prior active survey atomically. `NOT_FOUND`, `INVALID_STATE`, `INVALID_INPUT`. |
| `close_survey(p_survey_id uuid)` | instructor | `{ "id": uuid, "status": "closed" }` | Only active. `NOT_FOUND`, `INVALID_STATE`. |
| `archive_survey(p_survey_id uuid)` | instructor | `{ "id": uuid, "status": "archived" }` | Only draft or closed. `NOT_FOUND`, `INVALID_STATE`. |
| `delete_survey(p_survey_id uuid)` | instructor | `{ "id": uuid }` | Any non-active status; cascade. `NOT_FOUND`, `INVALID_STATE`. |
| `get_survey_results(p_survey_id uuid)` | instructor | `SurveyResults` | Includes all questions and choices, including zero counts. `NOT_FOUND`. |
| `get_survey_export(p_survey_id uuid)` | instructor | `ExportData` | All response rows and choices; never return tokens. `NOT_FOUND`. |

Instructor authorization failures can occur for every instructor RPC in addition to the listed resource errors. `is_instructor()` itself is a boolean helper, not a user-facing API. The list/detail/count queries below use instructor-authorized read access. An instructor session's database JWT must be checked server-side, not by trusting client state.

## Frontend shared contract (chat A owns)

All page-facing data access lives in `src/lib/api.ts`; page workstreams call these functions rather than Supabase directly. `src/lib/supabase.ts` owns the single client. `src/types/survey.ts` exports the following TypeScript types matching the wire structures above: `SurveyStatus`, `QuestionType`, `SurveySummary`, `SurveyDetail`, `Question`, `Choice`, `DraftInput`, `DraftQuestionInput`, `AnswerInput`, `PublicSurvey`, `PublicSurveyResult`, `SurveyResults`, `ExportData`, `AppErrorCode`, and `AppError`. `PublicSurveyResult` is the exact discriminated union in the RPC table; `AppError` has `code: AppErrorCode` and a safe `message: string`. Nullability and snake_case match the wire format. Auth state types/provider belong in `src/auth/`, with `AuthProvider`, `useAuth()` exposing `{ session, loading, signIn(email: string, password: string): Promise<void>, signOut(): Promise<void> }`, and `ProtectedRoute` redirecting unauthenticated users to `/login`. Handle authorization failures from the backend even after login.

`src/lib/api.ts` exports these functions; all return promises, throw `AppError` on failure, and accept UUIDs as strings:

```ts
listSurveys(): Promise<SurveySummary[]>
getSurvey(id: string): Promise<SurveyDetail>
saveDraft(id: string | null, draft: DraftInput): Promise<{ survey_id: string }>
duplicateSurvey(id: string): Promise<{ survey_id: string }>
activateSurvey(id: string): Promise<{ id: string; status: 'active'; public_slug: string }>
closeSurvey(id: string): Promise<{ id: string; status: 'closed' }>
archiveSurvey(id: string): Promise<{ id: string; status: 'archived' }>
deleteSurvey(id: string): Promise<{ id: string }>
getPublicSurvey(slug: string): Promise<PublicSurveyResult>
submitSurveyResponse(surveyId: string, anonymousToken: string, answers: AnswerInput[]): Promise<{ success: true; response_id: string }>
getSurveyResults(id: string): Promise<SurveyResults>
getSurveyExport(id: string): Promise<ExportData>
getResponseCount(id: string): Promise<number>
```

`listSurveys` orders by newest creation time then ID, including count for each survey; `getSurvey` includes ordered questions/choices and count; both are instructor-only. `getResponseCount` is an instructor-only exact count query, not a public endpoint. Ensure queries fetch all applicable rows rather than silently truncating results at a Supabase response limit; implement pagination where necessary. Calls to RPCs map camelCase function arguments to the exact `p_` names in the table. The UI can filter the returned list by title, status, and creation date. For save, the caller uses the returned ID and reloads rather than assuming question IDs remain stable.

Routes: `/` landing, `/login`, `/dashboard`, `/surveys/new`, `/surveys/:id/edit`, `/surveys/:id/present`, `/surveys/:id/results`, `/s/:slug`; all survey management routes and dashboard require an instructor session, while landing/login/student are public. The server remains the authorization authority. The public page has loading, closed, not-found, already-submitted, error and success states. Use semantic, keyboard-accessible controls, visible focus, readable contrast and large mobile touch targets.

Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_PUBLIC_SITE_URL`. Document names and placeholders in `.env.example`, never actual secrets. The public anon key is intended for a browser and is protected by database policy, but do not commit live credentials. No service-role key in Vite variables.

## Parallel ownership and integration

Chat A owns scaffold, dependencies and lockfile, configuration, router, `src/lib/`, `src/types/`, `src/auth/`, shared components/styles, landing/login, placeholders, `.env.example`, and integration of page exports. Chat B owns everything under `supabase/`, including migrations, database tests and database-specific setup instructions. They implement this same contract in parallel. Neither changes the other's files; coordinate a documented contract correction through the integration owner.

Once both finish, the following four chats work concurrently, replacing their assigned placeholders and adding only components beneath their own directories. Each page has a default export; chat A registers imports in the router. Shared changes go through chat A.

| Workstream | Exclusive files/directories |
| --- | --- |
| Dashboard | `src/pages/DashboardPage.tsx`, `src/components/dashboard/**` |
| Editor | `src/pages/SurveyEditorPage.tsx`, `src/components/editor/**` |
| Student | `src/pages/StudentSurveyPage.tsx`, `src/components/student/**` |
| Presentation, results and CSV | `src/pages/PresentSurveyPage.tsx`, `src/pages/ResultsPage.tsx`, `src/components/results/**`, `src/components/present/**` (CSV helper in results directory) |

Chat A owns integration. No chat edits `TODO.md` unless the user asks; each chat lists the checklist items it actually verified in its final message for the user to review. After integration run build and lint, database authorization and integrity tests, lifecycle and duplicate tests, end-to-end browser and mobile/QR checks, CSV checks, persistence and deployed deep-link checks. Verify production configuration and conduct the planned small load test. The assignment also requires a README, development summary, AI interaction history, database/results screenshots, repository and deployment URLs, and private grader access without repository credentials.

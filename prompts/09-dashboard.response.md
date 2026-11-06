Built the dashboard with survey cards, status-specific actions, confirmation dialogs, title/status/date filters, loading and empty states, and friendly API errors. Activation and duplication navigate to the appropriate survey pages after the list reloads.

Verification:

- All 18 Vitest tests passed, including dashboard filtering, sorting, and action availability.
- Dashboard files passed ESLint and Prettier checks.
- The full build failed on TypeScript errors in `src/components/editor/model.ts`.
- Full lint failed on errors in the results and student workstreams. Those files are outside my assigned scope.
- No live-data or browser verification was possible without a connected Supabase project.

The TODO items verified by the pure-function tests are **status-based action availability**, **title and status filtering**, and **date filtering**. The corresponding dashboard UI is implemented, but the remaining Phase 4 and Phase 10 behaviors still need integration testing with survey data. No commit was made.
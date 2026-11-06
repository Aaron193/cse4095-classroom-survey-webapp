Built the root Vite, React and TypeScript scaffold, with the requested dependencies and scripts. The frontend includes the contract types and API functions, Supabase configuration handling, authentication and protected routes, landing and login pages, shared UI components, the public URL helper, and placeholders for the later page workstreams.

Verification completed:

- Build passed with placeholder Supabase environment values.
- Lint passed.
- Vitest passed: 4 tests covering error mapping and public URL construction.
- No browser or real-database testing was performed. The survey management and student pages remain placeholders.
- npm reported 10 moderate dependency vulnerabilities during installation.

The TODO boxes supported by this work are the Phase 1 setup items: React and TypeScript with Vite, Tailwind, React Router, Supabase client, Recharts, QR package, folder structure, `.env.example`, ESLint and formatting, basic home page, and successful build. The authentication provider, protected route, login, logout, status badge, and shared loading, error, empty, and confirmation components are implemented, but their browser and backend behavior has not been verified.

I left `TODO.md` and `supabase/` untouched and made no commit.
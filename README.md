# SLGS Public Web + CMS

Production-oriented TypeScript monorepo for the Sierra Leone Grammar School public website and authenticated content management system.

- `apps/web` — anonymous published-content website.
- `apps/cms` — authenticated editorial and CMS administration.
- `apps/docs` — project documentation site.

Shared packages provide Better Auth integration, PostgreSQL/Drizzle persistence, CMS domain rules, a published-only public read boundary, authorization, validation and UI primitives.

Run `pnpm check` for formatting, lint, type checks, tests and builds. Current architecture and phased work are documented in `docs/`.

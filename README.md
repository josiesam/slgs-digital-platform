# SLGS Digital Platform

The Sierra Leone Grammar School Digital Platform is a pnpm/Turborepo monorepo with three intentionally separate applications:

- `apps/web` — public, read-only website;
- `apps/cms` — private editorial CMS;
- `apps/sims` — private school administration system.

Read `AGENTS.md`, `SLGS-TECHNICAL-CONSTITUTION.md`, and the relevant documents under `docs/` before changing behavior.

## Requirements

- Node.js 24
- pnpm 10
- PostgreSQL for database-backed development (not required for the Phase 0 app shells)

## Commands

```bash
pnpm install
pnpm dev
pnpm check
```

The development ports are Web `3000`, CMS `3001`, and S.I.M.S. `3002`.

## Environment

Copy the relevant `.env.example` file only when working on server-backed infrastructure. Never commit `.env` files or real school data.

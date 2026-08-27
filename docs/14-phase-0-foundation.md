# Phase 0 Foundation

## Scope

Phase 0 establishes an executable monorepo and security-aware infrastructure seams. It does not implement public editorial content, CMS workflows, school records, attendance, assessments, results, fees or asset lifecycle features.

## Workspace

- pnpm workspaces
- Turborepo task orchestration
- TypeScript strict mode
- ESLint and Prettier
- Vitest
- three independently buildable TanStack Start applications

## Initial shared packages

- `packages/config` — shared TypeScript and tool configuration
- `packages/ui` — accessible, application-neutral primitives
- `packages/validation` — shared boundary schemas, including environment parsing
- `packages/permissions` — permission grammar and deny-by-default checks
- `packages/db` — PostgreSQL/Drizzle connectivity and schema ownership conventions
- `packages/auth` — application identity and session contracts

Shared packages are not a dumping ground. Business-domain packages are added only when their phase begins.

## Security invariants

1. Public Web cannot import S.I.M.S. modules.
2. CMS membership never implies S.I.M.S. membership.
3. Authorization is evaluated server-side from trusted grants.
4. Each production application receives its own runtime credentials.
5. Browser-exposed environment variables use an explicit public prefix and contain no secrets.
6. Fixtures and examples are synthetic.

## Environment conventions

- `.env.example` documents variable names only.
- `.env`, `.env.local`, `.dev.vars` and provider secret files are ignored.
- each application validates its own environment at startup or first server use;
- server-only configuration must not be imported by client modules;
- production secret values are supplied by the selected deployment platform.

## Database conventions

- PostgreSQL is the system of record.
- Drizzle owns schema definitions and migrations.
- `DATABASE_URL` is server-only.
- schema changes use generated, reviewed migrations rather than runtime schema push.
- production migrations run with a dedicated migration identity.
- no domain tables are introduced until their requirements are approved.

## Authentication foundation

Better Auth is the selected authentication library. Phase 0 establishes its package boundary and configuration contract, but production login methods, email delivery, MFA, recovery and initial administrator provisioning remain unresolved. Authentication must not be enabled with unsafe placeholder secrets.

Phase 1A resolves and activates this boundary in `docs/15-identity-and-access-policy.md`. The preceding paragraph is retained as the historical Phase 0 state.

## Quality gates

A Phase 0 change must pass:

- frozen dependency install;
- formatting check;
- lint;
- typecheck;
- unit tests;
- all application builds;
- boundary tests proving application-scoped authorization.

## Exit criteria

- a clean clone installs deterministically;
- Web, CMS and S.I.M.S. build independently;
- shared packages have explicit ownership;
- environment parsing rejects invalid configuration;
- permissions deny absent and cross-application grants;
- no secrets or real school data are committed;
- unresolved production and domain decisions remain documented.

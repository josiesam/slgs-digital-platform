# Architecture Decision Log

## ADR-001 — One monorepo, three applications

Status: Accepted

The platform uses one repository but keeps the public website, CMS, and S.I.M.S. as separate deployable applications.

Reason:
- security isolation
- different user populations
- different operational concerns
- independent deployment
- shared packages remain possible

## ADR-002 — CMS is not S.I.M.S.

Status: Accepted

CMS users must not gain administrative school-record access.

Reason:
Student clubs need content permissions but must never receive student, staff, attendance, academic, finance, or asset-management access.

## ADR-003 — PostgreSQL + Drizzle

Status: Accepted

Use PostgreSQL for relational integrity and Drizzle for typed database access/migrations.

## ADR-004 — Better Auth

Status: Accepted

Use Better Auth unless requirements or deployment constraints require another authentication system.

## ADR-005 — Asset history is event-oriented

Status: Accepted

Do not model asset allocation/maintenance/repair/disposal only as mutable fields on the asset row. Preserve historical records.

## ADR-006 — Student content requires moderation

Status: Accepted

Student club content should follow a draft/review/approval/publish workflow.

## ADR-007 — pnpm workspaces with Turborepo

Status: Accepted

Use pnpm workspaces for dependency management and Turborepo for the repository task graph.

Reason:
- pnpm provides deterministic workspace dependency resolution and efficient installs;
- Turborepo provides a small, explicit task graph without changing application boundaries;
- both tools support independently buildable applications and shared packages.

The repository pins pnpm through `packageManager` and its Node.js line through `.nvmrc` and `engines`.

## ADR-008 — TanStack Start on a portable Node baseline

Status: Accepted for Phase 0

All three applications use TanStack Start with Vite and React. Phase 0 targets a portable Node.js production build rather than a provider-specific runtime.

Reason:
- the production hosting provider has not been selected;
- provider-specific adapters must not force a database or storage choice;
- Node-compatible deployments support PostgreSQL drivers and preserve future hosting options.

The final hosting provider, regions, service levels, and production adapter remain deployment decisions. A provider change requires build and security verification for all three applications.

## ADR-009 — One PostgreSQL service with isolated schemas and runtime roles

Status: Accepted for initial development; production review required

Start with one PostgreSQL service organized into logical schemas. Use distinct runtime credentials for Web, CMS, and S.I.M.S., plus a separate migration credential.

Rules:
- Web receives read-only access only to an explicit published-content read model.
- CMS credentials cannot read S.I.M.S. schemas.
- S.I.M.S. credentials do not imply CMS administration rights.
- migration credentials are never application runtime credentials.
- database packages expose scoped repositories rather than unrestricted cross-domain access.

Reason:
This keeps local development and migrations manageable while making the security boundary enforceable at both application and database levels. Before production, privacy, hosting, backup, and operational requirements must confirm whether S.I.M.S. needs a separate PostgreSQL service.

## ADR-010 — Shared identity, application-scoped authorization

Status: Accepted for Phase 0

Use one identity model so a person can authenticate consistently, but grant access through independent application memberships, roles, and permissions.

Authentication answers who the user is. Authorization answers what that identity may do in a specific application. No global administrator role grants access across CMS and S.I.M.S.

Better Auth provides session and account infrastructure. SLGS-owned permission checks use explicit `domain:action[:scope]` values, deny by default, and run on the server.

## ADR-011 — Phase 0 contains infrastructure, not business domains

Status: Accepted

Phase 0 may establish application shells, shared UI primitives, validated environment contracts, database connectivity, authentication interfaces, authorization primitives, tests, and CI. It must not implement CMS content types, student/staff records, attendance, results, or asset workflows.

Reason:
The detailed business rules and fields remain unresolved. Creating those schemas during foundation work would silently turn assumptions into migrations.

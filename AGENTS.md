# SLGS Digital Platform — Codex Project Instructions

## Mission

Build the Sierra Leone Grammar School (SLGS) Digital Platform as a production-quality monorepo containing three intentionally separated applications:

1. `apps/web` — public SLGS website.
2. `apps/cms` — private CMS for the public website.
3. `apps/sims` — private S.I.M.S. administration portal, including ICT/STEM inventory and asset management.

The current `http://slgs.edu.sl` website is a legacy reference only. Do not preserve its implementation, information architecture, visual design, or technical debt merely for compatibility.

## Source of truth

Before implementing a feature, read the relevant files under `docs/`:

- `docs/01-product-requirements.md`
- `docs/02-applications-and-modules.md`
- `docs/03-roles-and-permissions.md`
- `docs/04-data-model.md`
- `docs/05-architecture.md`
- `docs/06-implementation-phases.md`
- `docs/07-codex-workflow.md`
- `docs/08-skills.md`
- `docs/09-first-codex-tasks.md`
- `docs/10-decision-log.md`
- `docs/11-codex-agent-routing.md`
- `docs/12-initial-architecture-decisions.md`
- `docs/13-first-agent-prompts.md`
- `docs/14-phase-0-foundation.md`
- `docs/15-identity-and-access-policy.md`
- `docs/16-phase-1a-infrastructure.md`

The original sitemap is preserved in `docs/source/site-map-mermaid.md`.
The provided 2026 SaaS stack transcript is preserved in `docs/source/tech-stack-2026.md`.

If project code conflicts with these documents, stop and identify the conflict rather than silently choosing a direction.

## Core architecture rules

- Keep Web, CMS, and S.I.M.S. as separate applications even though they share a monorepo.
- Never expose S.I.M.S. data through public website routes.
- Never give CMS users S.I.M.S. permissions by implication.
- Share packages, types, validation schemas, UI primitives, database access utilities, and auth infrastructure only where appropriate.
- Use PostgreSQL + Drizzle as the planned relational data layer.
- Use TypeScript throughout.
- Use React-based applications.
- Prefer TanStack Start for full-stack application boundaries unless a documented decision changes it.
- Use shadcn/ui and Tailwind for UI primitives and a coherent SLGS design system.
- Use Zod for runtime validation at boundaries.
- Use Better Auth for authentication unless a later architecture decision replaces it.
- Keep authorization server-side. UI hiding is not security.
- Use least privilege for all roles.
- Treat student-created content as moderated content.
- Preserve auditability for publishing, identity/permission changes, student records, and asset lifecycle events.

## Coding standards

- Do not add dependencies without explaining why the existing stack cannot solve the problem.
- Prefer small, composable modules.
- Avoid premature abstractions.
- Avoid generic CRUD generators when domain rules are non-trivial.
- Keep database queries close to their domain service/repository boundary.
- Validate external input with Zod.
- Write tests for domain rules and permission boundaries.
- Do not use `any` unless there is a documented, unavoidable reason.
- Do not commit secrets.
- Never place credentials in source, fixtures, seed data, screenshots, or documentation.
- Do not use real student/personally identifiable data in development fixtures.

## Security requirements

S.I.M.S. contains sensitive school information. Assume student, staff, attendance, academic, financial, and administrative records are confidential.

Required principles:

- default deny
- explicit permission checks
- server-side authorization
- audit logs for sensitive mutations
- safe file upload validation
- controlled media access
- rate limiting where appropriate
- secure session/cookie configuration
- no sensitive data in client bundles
- no sensitive data in logs
- no production data in local development

## Product boundaries

### Public Web

Read-only public content:

- school information
- admissions information
- academics
- school life
- parents information
- news
- events
- gallery
- contact information

### CMS

Content operations only:

- pages
- articles
- events
- galleries
- media
- drafts
- review/approval
- publishing
- content audit trail

### S.I.M.S.

Administrative operations:

- students
- staff
- classes
- subjects
- academic sessions
- attendance
- examinations/results
- fees (future phase)
- reports
- users/roles
- ICT/STEM assets
- locations
- allocations
- maintenance
- repairs
- procurement
- disposal
- audit logs

## Implementation discipline

Do not build the whole platform in one pass.

For each task:

1. Read the relevant requirements.
2. Inspect the current repository.
3. State assumptions and affected modules.
4. Make the smallest coherent change.
5. Run relevant type checks/tests/lint/build.
6. Review authorization and data exposure.
7. Update documentation when architecture or behavior changes.
8. Report what changed, what was verified, and any remaining risk.

When a task is ambiguous, ask before making a consequential architectural decision.

## UI direction

The public site should feel like a respected secondary school: clear, modern, welcoming, institutional, accessible, responsive, and content-led.

The CMS and S.I.M.S. should prioritize operational clarity over marketing aesthetics.

Avoid generic AI-dashboard visual patterns. Use the project's design system consistently.

## Definition of done

A feature is not complete merely because the UI renders.

A feature is complete when:

- requirements are satisfied;
- authorization is enforced;
- validation exists at relevant boundaries;
- database migrations/schema are correct;
- tests cover important domain rules;
- responsive/accessibility behavior is acceptable;
- no secrets or sensitive test data are introduced;
- documentation is updated where needed;
- relevant checks pass.

# SLGS Digital Platform — Technical Constitution

Version: 0.1

This governs engineering decisions for the SLGS Digital Platform and supplements `AGENTS.md`.

## Non-negotiable boundaries
- `apps/web` = public website.
- `apps/cms` = private public-content CMS.
- `apps/sims` = private S.I.M.S.
- One monorepo does not mean one security boundary.
- Public Web must never expose private S.I.M.S. data.
- CMS must never inherit S.I.M.S. permissions.
- Student clubs may create/submit content but do not receive publishing authority by default.
- Sensitive S.I.M.S. operations require explicit server-side authorization.
- UI visibility is not authorization.
- Never use real student/staff data in development, tests, screenshots, examples, or fixtures.
- Never commit secrets or production exports.

## Preferred stack
TypeScript, React, TanStack Start, Tailwind CSS, shadcn/ui, PostgreSQL, Drizzle ORM, Better Auth, Zod.

Add dependencies only when they solve a demonstrated need.

## Architecture
Prefer explicit application boundaries, domain-oriented modules, typed interfaces, validated boundaries, server-side data access, and predictable errors.

Avoid giant shared packages, circular dependencies, business logic in UI components, scattered database calls, magic permissions, and premature abstractions.

## Database
PostgreSQL is the system of record. Drizzle owns schema and migrations.

Important relationships, uniqueness, foreign keys, deletion behavior, timestamps, and historical records must be deliberate. Do not silently overwrite important history.

## Authorization
Use `domain:action[:scope]` permissions, e.g. `students:read`, `assets:transfer`, `content:publish`.

Deny by default. Enforce on the server. Never trust client-supplied roles or IDs.

## Content publishing
`draft → submitted → review → approved/rejected → published`

Publishing is an explicit state transition and must be auditable.

## Media
Binary files belong in object storage. PostgreSQL stores metadata, relationships, state, and audit information. Validate type, size, filename/storage key and access rules.

## S.I.M.S. privacy
Treat student, staff, attendance, academic and financial information as confidential. Avoid sensitive fields in URLs/logs and avoid broad list responses.

## Asset management
Asset identity is stable. Allocation, maintenance, repair, procurement and disposal must remain historically traceable.

## UI
Public Web: institutional, welcoming, accessible, responsive, content-led.
CMS: editorial and workflow-focused.
S.I.M.S.: operational, information-dense but readable, permission-aware.

Avoid generic AI-dashboard aesthetics.

## Accessibility
Target WCAG 2.2 AA where practical. Support keyboard navigation, visible focus, semantic HTML, labels, useful errors, contrast and reduced motion.

## Testing
At minimum cover domain rules, permissions, database/service behavior, important component interactions, and critical end-to-end flows.

Critical flows include CMS publication, CMS/S.I.M.S. isolation, S.I.M.S. permissions, asset transfer and asset lifecycle.

## Observability
Use structured logs. Never log passwords, tokens, secrets, or unnecessary sensitive school data. Error monitoring must respect privacy/retention requirements.

## Definition of Done
A feature is done only when requirements, validation, authorization, migration, tests, accessibility, error/loading/empty states, security review and relevant documentation are addressed and checks pass.

# Phase 2B — S.I.M.S. Core

Status: **CONDITIONALLY CLOSED — OPERATIONAL VERIFICATION PENDING**

## Scope delivered

Phase 2B establishes confidential administrative records for students, staff, academic classes, subjects and academic sessions. It does not implement student login, attendance, assessment/results, reports, fees, assets, procurement, inventory, notifications, analytics, AI, CMS changes or public-Web projections.

The implementation consists of the `sims` PostgreSQL schema, typed Drizzle schema/repository, `@slgs/sims-domain` validation and transactional services, closed-catalogue permissions, Better-Auth-session-derived server functions, append-only security audit events and S.I.M.S. list/detail/create/edit routes.

## Domain model

- `sims.student`: opaque ID, unique student number, unique admission number, name, lifecycle, admission date and optional current class. It has no credential or identity-account column.
- `sims.staff`: opaque ID, unique staff number, name, optional contact email, lifecycle and optional explicit Better Auth identity link. It stores no credential.
- `sims.academic_class`: opaque ID, session-scoped code/name and lifecycle. Codes may recur in another session.
- `sims.subject`: opaque ID, session-scoped code/name, optional description and lifecycle. Teacher allocation and student enrolment are absent.
- `sims.academic_session`: opaque ID, human name, inclusive start/end dates and planned/active/closed lifecycle. End date cannot precede start date.

Department/organisation, date of birth, guardian/contact records, subject enrolment and teacher allocation were not added because no approved policy/model justifies them. A single-active-session constraint was not invented.

## Authorization

All requests derive the actor from the authenticated Better Auth session. The domain service evaluates the active S.I.M.S. grant through `@slgs/permissions`; actor IDs are not accepted from browser payloads.

Phase 2B school-wide permissions are `read/create/update` for `student`, `staff`, `class`, `subject` and `academic_session`, each with `:school`. No delete permission exists.

- S.I.M.S. System Administrator: school-wide Phase 2B read/create/update plus its existing system/configuration authority; it still has no role-assignment authority.
- School Administrator: school-wide Phase 2B read/create/update; it receives no identity, access-role, custom-role or infrastructure authority.
- Access Administrator: no Phase 2B record permission; its approved-role assignment authority does not imply confidential-record access.
- Operational Staff: retains only the previously approved `student:read:assigned` and `student:update:assigned`. Exact class/subject/session/staff mappings remain `DECISION REQUIRED`, so no new scoped permission was inferred.

Assignment entitlements remain independent. List scope predicates execute in SQL, are capped at 50 rows (25 in the UI), and do not borrow scope from another assignment.

## Database and audit

Migration `0011_phase-2b-sims-core.sql` creates only the five Phase 2B tables, enums, constraints, foreign keys and indexes. `slgs_sims` receives schema usage and SELECT/INSERT/UPDATE only. `slgs_cms` and `slgs_web` are explicitly revoked. RLS restricts the schema to the S.I.M.S. runtime role; record-level assignment scope remains server-authorized because the shared runtime credential cannot represent the end-user assignment.

Successful mutations and authorization denials append sanitized events to the existing immutable `identity.security_audit_event`. Mutations and their successful audit event execute in one transaction. No parallel audit table exists.

## UI and query behavior

`/core/students`, `/core/staff`, `/core/classes`, `/core/subjects` and `/core/academic-sessions` provide searchable, status-filtered, sorted, cursor-paginated lists and create forms. `/$id` provides authorized detail/edit. Lifecycle closure requires confirmation. Forms use semantic labels, visible focus, status feedback and responsive layouts. Empty states contain no fabricated school data.

UI visibility is usability only. Every loader and mutation re-establishes the authenticated session and enforces authorization independently.

## Automated verification

- Zod tests cover the credential-free student boundary, optional staff identity link and session date validation.
- Domain tests cover student create/update/archive, audit success/denial, cross-scope denial, scoped Operational Staff read/write, session/class/subject/staff creation and access-only denial.
- Permission/auth tests cover the closed Phase 2B catalogue, no deletion, CMS separation and exact School/System/Access boundaries.
- S.I.M.S. application tests cover role-aware navigation, CMS/access-only denial, lifecycle confirmation and rejection of browser actor authority.
- The final-gate audit found and remediated three implementation defects before closure: denied list requests now append authorization audit events; pagination cursors now carry the actual sort value plus record ID; and core navigation/create/edit controls now reflect explicit per-resource permissions.
- Full `pnpm check` passes after remediation: formatting, lint, TypeScript, unit/domain tests and all three production builds. The repository suite reports 103 passing tests and one intentionally opt-in R2 integration test skipped.

## Operational verification

Run only on an approved disposable environment. Set `SLGS_VERIFICATION_DISPOSABLE=true` and a non-empty `SLGS_VERIFICATION_ENVIRONMENT_ID`, apply migration `0011`, then execute:

```bash
pnpm --filter @slgs/db db:verify:phase2b
```

The verifier connects separately as `slgs_sims`, `slgs_cms` and `slgs_web`, creates only synthetic records inside a rolled-back transaction, verifies lifecycle/audit behavior and delete denial, and verifies CMS/Web schema isolation. The authenticated browser matrix and environment cleanup remain owned by the Senior Software Engineer under `docs/21-operational-verification-runbook.md`.

## DECISION REQUIRED

1. Approve exact Operational Staff role-to-resource mappings and assignment dimensions for students, staff, classes, subjects and sessions.
2. Decide whether exactly one academic session may be active at a time and define transition authority.
3. Approve any additional sensitive student/staff fields, field-level visibility, evidence, retention and correction rules before adding them.
4. Approve the organisational/department model before staff organisational scope is implemented.
5. Approve whether subject definitions are session-specific long-term; Phase 2B uses the evaluated Subject → Academic Session relationship.
6. Define archival/reactivation approval rules and retention/export schedules.

These decisions remain default-denied and do not invalidate the non-destructive Phase 2B foundation.

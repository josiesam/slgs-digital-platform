# Product Scope Reset Register

Status: **ACTIVE**

## Active documents

- `01-product-requirements.md` through `06-implementation-phases.md`: current Public Web + CMS product, application, authorization, data, architecture and roadmap.
- `15-identity-and-access-policy.md` through `19-phase-1d-public-web-integration.md`: current CMS identity/authorization, editorial/media and public-read boundaries.
- `21-operational-verification-runbook.md`: active Public Web + CMS operational ownership and safety procedure.
- `25-product-scope-reset.md`: this classification and decommissioning record.
- `26-cms-operational-verification-checklist.md`: production backup, migration, SQL, browser, R2, deployment and sign-off gate.
- `27-fresh-database-role-and-migration-setup.md`: clean-project database roles, migration ownership, least-privilege finalization and verification runbook.

## Historical documents

- `07-codex-workflow.md` through `14-phase-0-foundation.md`: original planning, routing and architectural history. ADR-040 in `10-decision-log.md` is the controlling current scope decision.
- `source/site-map-mermaid.md` and `source/tech-stack-2026.md`: source material only.

## Deprecated documents

- `20-phase-2a-sims-identity-administration.md`
- `22-phase-2b-sims-core.md`
- `23-phase-2c-attendance-readiness.md`
- `24-phase-2c-attendance.md`

These documents preserve architectural history and do not authorize active implementation.

## Remaining search-match classification

The repository-wide case-insensitive search covers `sims`, `student`, `staff`, `attendance`, `academic_session`, obsolete role/permission forms, environment variables, workspace package names and imports. Every remaining match belongs to one of these exhaustive location classes:

| Classification | Remaining locations | Reason |
|---|---|---|
| **ACTIVE** | `0013_product-scope-reset.sql`, `verification/product-scope-reset.sql`, ADR-040, active scope/security documents, and negative catalogue tests | These matches remove or assert the absence of discontinued functionality; they do not expose it as an active product path. |
| **HISTORICAL** | Immutable migrations `0000`–`0012` and their snapshots/journal; ADR-001–ADR-039; `docs/07`–`docs/14`; `docs/source/*`; `phase-plan.md` | These preserve migration and decision history. `phase-plan.md` is explicitly marked superseded. |
| **DEPRECATED** | `docs/20-phase-2a-sims-identity-administration.md`, `docs/22-phase-2b-sims-core.md`, `docs/23-phase-2c-attendance-readiness.md`, and `docs/24-phase-2c-attendance.md` | The documents are retained for project history and explicitly do not authorize implementation or operations. |
| **FALSE POSITIVE** | Public-site audience/copy references and CMS guidance for moderated school-club contributors | “Student” or “staff” describes a public audience or a human CMS contributor, not a student/staff data model, role, identity, authentication path, or management feature. |

No obsolete application, package, workspace dependency, import, runtime environment variable, command, route, permission, role contract, schema export, or active project skill remains.

## Database decommissioning

Migration `0013_product-scope-reset.sql` removes obsolete role assignments/scopes, memberships, role definitions and bootstrap requests; drops obsolete triggers, functions, schema and enum types; replaces mixed-application RLS policies with CMS-only policies; restores least-privileged CMS user-provisioning/session-revocation grants; updates the system-managed CMS role; revokes obsolete privileges; and drops the obsolete runtime role.

Existing migrations and snapshots are intentionally unchanged history. Historical security audit rows remain preserved. The `application_name` and `authorization_scope_dimension` PostgreSQL enum values are retained as harmless migration-history compatibility; active TypeScript contracts accept only CMS and its two scopes.

Production execution requires approved backup/retention review and Senior Software Engineer sign-off. Repository work does not delete production data, credentials, DNS or R2 infrastructure.

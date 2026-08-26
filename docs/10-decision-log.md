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

Status: Proposed

Use PostgreSQL for relational integrity and Drizzle for typed database access/migrations.

## ADR-004 — Better Auth

Status: Proposed

Use Better Auth unless requirements or deployment constraints require another authentication system.

## ADR-005 — Asset history is event-oriented

Status: Accepted

Do not model asset allocation/maintenance/repair/disposal only as mutable fields on the asset row. Preserve historical records.

## ADR-006 — Student content requires moderation

Status: Accepted

Student club content should follow a draft/review/approval/publish workflow.

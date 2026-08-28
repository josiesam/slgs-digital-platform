# Phase 1B Authorization Model

Status: Implemented

## Architecture

Better Auth establishes the authenticated identity and application-specific session. SLGS authorization evaluates `identity → active application membership → active role assignment → known permission → assignment scope → resource context → explicit business denials`.

`@slgs/permissions` is the single policy-evaluation boundary. Server code supplies trusted identity, application and resource context; browser-supplied roles or grants are never authoritative. Missing, malformed, unknown, cross-application and scope-mismatched capabilities are denied.

## Permission grammar and roles

Permissions use `domain:action[:scope]`. The grammar validator rejects malformed values and the closed Phase 1B catalogue rejects well-formed but unapproved values.

CMS roles are Multimedia Club, News Journal Club, Editor, Reviewer, Approver, Publisher and CMS Administrator. Workflow capabilities remain separated. S.I.M.S. roles are School Administrator, Access Administrator, System Administrator and Operational Staff. Access Administrators assign/revoke approved roles but cannot define roles. Operational Staff have no delete capability. The five-active-System-Administrator ceiling remains unchanged.

Roles belong to one application. Assignments belong to one application membership. Service and database checks reject mismatched applications.

## Scope model

Scopes remain on the role assignment that grants the permission, preventing one role from borrowing another role's scope. A binding is a validated `{ dimension, value }` pair. Technical dimensions are `club`, `class`, `subject`, `department`, `academic_session`, `term`, `organisation` and `location`.

These dimensions are capability, not school-policy assignments. Club roles allow `club`; editorial assignment uses `organisation`; operational staff can technically use the listed S.I.M.S. dimensions. The final operational matrix is **DECISION REQUIRED**.

- `own` compares the identity with trusted resource ownership.
- `club` requires an identical club binding on assignment and resource.
- `assigned` requires an identical assignment/resource binding.
- `approved` and `published` require trusted workflow state.
- `cms`, `sims`, `identity` and `school` never bypass membership.

## Explicit denials and administration

An author cannot review or approve their own content even when otherwise permitted. Phase 1C must supply the persisted author ID as trusted context.

Assignment validates active identity, active membership, active same-application role, allowed scope dimensions and actor permission. Revocation is historical. S.I.M.S. custom role creation requires `role:create:sims` and validates all permissions/scopes. CMS custom-role authority remains unresolved.

## Isolation, audit and invariants

Separate application sessions, memberships and runtime principals remain mandatory. PostgreSQL row-level policies constrain memberships, role definitions, assignments and scopes to the runtime principal's application. Role creation, assignment and revocation write sanitized, attributable audit events.

Tests prove deny-by-default, invalid permission rejection, application isolation, assignment-level scope provenance, self-review/approval denial, workflow-role separation, Access Administrator limitations, operational no-delete, cross-application assignment rejection and the existing five-administrator ceiling.

## Decision register

### AUTH-001 — Operational S.I.M.S. scope matrix

Question: Which named operational roles receive which class, subject, department, session, term or location scopes? Why: this controls confidential record exposure. Options: duty-based roles; individually approved assignments; a constrained combination. Impact: policy assignments only; the evaluator is ready.

### AUTH-002 — CMS supervisors and approvers

**Accepted for Phase 1C:** explicitly assigned Member / Club Leadership supervises its own club scope. Content approval belongs to the separate Approver role. Named assignees remain operational provisioning data.

### AUTH-003 — CMS role-definition authority

**Accepted for Phase 1C:** only CMS System Administrators may define custom CMS roles. Definitions are restricted to the closed CMS catalogue.

### AUTH-004 — Assignment approval workflow

**Accepted for Phase 1C:** normal role assignment does not require a second approver. Two-person privileged bootstrap remains mandatory.

### AUTH-005 — Scope value ownership

**Accepted for CMS:** explicitly assigned Member / Club Leadership owns club scope lifecycle. Ownership of S.I.M.S. scope registries remains part of AUTH-001.

### AUTH-006 — Denial auditing

**Accepted for Phase 1C:** every routine authorization denial is persisted as a sanitized security/editorial audit event.

Identity evidence and MFA are optional for now. Retention and incident-response ownership are required; exact duration, named contact and escalation details remain `DECISION REQUIRED — OPERATIONAL DETAIL`.

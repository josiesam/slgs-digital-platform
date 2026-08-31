# Phase 2C — Attendance Design Gate

Status: **DESIGN CONDITIONALLY APPROVED — IMPLEMENTATION NOT AUTHORIZED**

Phase 2C is limited to attendance. This document fixes the safe technical boundary and records the school-policy decisions that must be approved before implementation. It does not create attendance code, tables, permissions or routes.

## Existing architecture reused

- Phase 2B `student`, `staff`, `academic_class`, `subject` and `academic_session` identifiers.
- Better Auth identity and S.I.M.S.-owned membership/role assignments.
- The closed `domain:action[:scope]` permission catalogue and assignment-bound scope evaluator.
- The private `sims` schema, `slgs_sims` runtime role, RLS, CMS/Web isolation and migration-only credential.
- Typed `@slgs/sims-domain` repositories/services, Zod boundaries and authenticated TanStack server functions.
- Append-only `identity.security_audit_event`.

## Eight design and policy decisions

| Decision | Status | Gate effect |
|---|---|---|
| Attendance model: daily class or subject/lesson occurrence | **DECISION REQUIRED — SCHOOL POLICY** | Blocks deterministic occurrence identity, schema uniqueness, forms and implementation. |
| Authoritative attendance states | **DECISION REQUIRED — SCHOOL POLICY** | Blocks enum/check constraints, validation and UI. |
| Historical class membership | **ARCHITECTURE DECIDED — ADR-036** | Attendance stores its session/class context and immutable student roster entries; history never follows `student.class_id`. Exact roster-admission policy remains required. |
| Term/calendar dependency | **ARCHITECTURE DECIDED — ADR-037** | No term/calendar subsystem is required for the Phase 2C baseline. Session, class and date are mandatory. Reopen only if school policy requires term reporting or validation. |
| Authorization and assignment mappings | **DECISION REQUIRED — SCHOOL POLICY** | Blocks role contracts and permission migration. Access Administrator remains denied by default. |
| Correction model | **ARCHITECTURE DECIDED IN PART — ADR-038** | Original evidence is immutable and corrections supersede it. Corrector roles, reason requirement, time limit and approval remain required. |
| Staff attribution | **ARCHITECTURE DECIDED — ADR-039** | Authenticated identity is mandatory attribution; an explicitly linked staff record is stored when available but is not treated as authentication. |
| Sensitive access and retention | **DECISION REQUIRED — OPERATIONAL POLICY** | Read/export/history visibility and retention require approval before production rollout; no export is in Phase 2C scope. |

## Proposed domain model

### Attendance occurrence

Represents one attendance-taking event. Required facts:

- opaque ID;
- academic session ID;
- class ID;
- attendance date;
- lifecycle such as open/finalized only if finalization is approved;
- authenticated recorder identity ID;
- optional explicitly linked recorder staff ID;
- created/finalized timestamps.

Subject ID and an occurrence/period discriminator are prohibited unless the project owner selects subject/lesson attendance.

### Attendance entry

Represents one student in one occurrence:

- opaque ID;
- occurrence ID;
- student ID;
- attendance state from the approved constrained state set;
- attendance-time session and class context, directly or through the immutable occurrence;
- attribution and timestamp.

The occurrence roster is historical evidence. Reassigning `student.class_id` later cannot move or reinterpret an earlier entry.

### Attendance correction

An append-only correction references the entry/version it supersedes and records:

- corrected state;
- authenticated corrector identity;
- optional linked staff ID;
- reason if policy requires it;
- correction timestamp;
- superseded record/version.

No runtime DELETE or in-place destruction of the original observation is allowed. Approval is not added unless school policy requires it.

## Deterministic occurrence identity

The final uniqueness rule is blocked by Decision 1:

- Daily class model candidate: unique `(academic_session_id, class_id, attendance_date)`.
- Subject/lesson model candidate: unique `(academic_session_id, class_id, subject_id, attendance_date, occurrence_key)`.

Within either model, an attendance entry is unique by `(occurrence_id, student_id)`. No migration may be written until exactly one occurrence rule is approved.

## Proposed database design

After approval, the next migration should add only attendance tables under `sims`:

- `attendance_occurrence`;
- `attendance_entry`;
- `attendance_correction` or an equivalent immutable version chain.

Requirements:

- restrictive foreign keys to Phase 2B entities and identity/staff attribution;
- database-constrained approved state values;
- deterministic occurrence and student-entry uniqueness;
- date/session consistency validation in the service and feasible database checks;
- indexes for session/class/date, student/date and correction history;
- `slgs_sims` SELECT/INSERT and only the minimum UPDATE needed for an approved finalization mechanism;
- no runtime DELETE;
- explicit RLS/runtime isolation and CMS/Web revocation;
- migration-only role changes, never runtime migration credentials.

Assignment scope remains end-user authorization enforced by the service and repository SQL because the database connection uses the shared `slgs_sims` runtime role.

## Authorization design gate

No Phase 2C permission is active until policy approval. The proposed closed-catalogue shape is:

- `attendance:read:school`
- `attendance:create:school`
- `attendance:correct:school`
- `attendance:read:assigned`
- `attendance:create:assigned`
- `attendance:correct:assigned`

The existing unused `attendance:update:assigned` requires an explicit migration decision: replace it with `attendance:create:assigned`/`attendance:correct:assigned`, or define a narrowly bounded meaning. It must not silently authorize destructive overwrite.

| Role | Read | Create | Correct | Phase 2C status |
|---|---|---|---|---|
| S.I.M.S. System Administrator | DECISION REQUIRED | DECISION REQUIRED | DECISION REQUIRED | Role name does not imply attendance authority. |
| School Administrator | Existing catalogue has school read only | DECISION REQUIRED | DECISION REQUIRED | Exact school authority must be approved. |
| Access Administrator | Denied | Denied | Denied | Approved-role administration grants no attendance access. |
| Operational Staff | Existing assigned read only | DECISION REQUIRED | DECISION REQUIRED | Exact class/subject/session mappings are required. |
| CMS roles/Web users | Denied | Denied | Denied | Application/database boundary is absolute. |

For assigned authority, repository SQL must match the granting entitlement against the occurrence's class and academic-session scopes. Subject scope applies only if subject attendance is approved. Organisation, department, location and term do not apply without an approved relationship.

## Audit events

Use `identity.security_audit_event`; do not create a parallel audit system. Candidate event names:

- `attendance.occurrence_created`;
- `attendance.occurrence_finalized` if finalization is approved;
- `attendance.entry_recorded`;
- `attendance.entry_corrected`;
- `authorization.denied`.

Metadata may contain opaque occurrence/entry IDs, state transition names and scope identifiers. It must not contain credentials, session material, unrestricted roster payloads or sensitive correction narratives.

## UI and routes

The existing S.I.M.S. convention supports:

- `/attendance` — authorized bounded list with session, class and date filters;
- `/attendance/new` — attendance occurrence/roster entry;
- `/attendance/$id` — occurrence detail, recorder attribution and effective state;
- `/attendance/$id/corrections` — only if the approved policy permits correction access.

The interface must provide role-aware controls while independently authorizing every loader and mutation. It must include semantic labels, keyboard roster operation, visible focus, validation/error announcements, unsaved-change and correction confirmation, bounded pagination, responsive mobile layout and no unnecessary student/staff fields.

## Test strategy

### Domain

- approved occurrence uniqueness and duplicate rejection;
- valid and invalid constrained states;
- one entry per student/occurrence;
- historical class/session preservation after student reassignment;
- immutable superseding correction and effective-state resolution;
- recorder identity/staff-link separation;
- transaction and audit atomicity.

### Authorization

- no identity, no membership, inactive membership and revoked role;
- Access Administrator denial;
- every approved School/System action;
- Operational Staff same-class/session success and cross-class/session denial;
- subject-scope behavior only if subject attendance is approved;
- assignment non-borrowing;
- unauthorized correction and denial audit;
- CMS/Web cross-application denial.

### Database

A fail-closed disposable verifier must cover migration, effective runtime grants, RLS, CMS/Web denial, DELETE denial, foreign keys, occurrence/entry uniqueness, immutable correction evidence and rolled-back synthetic records. It must require explicit disposable-environment confirmation and never log connection strings.

### Application and browser

Automated application tests must cover protected loaders/server mutations, resource-aware navigation, direct-call denial, filtering, validation, roster bounds and correction confirmation. The Senior Software Engineer browser matrix must cover approved roles, create/view/correct, cross-scope denial, mobile, keyboard, focus, validation, error feedback, audit inspection and cleanup using synthetic data only.

## Evidence classification

- Architecture and this design gate: **IMPLEMENTATION VERIFIED** as documentation.
- Future code/migration/tests: **NOT IMPLEMENTED**.
- Disposable Neon runtime/RLS and authenticated browser matrix: **OPERATIONAL VERIFICATION REQUIRED**.
- Production retention, safeguarding, secrets, monitoring and rollout: **PRODUCTION SIGN-OFF REQUIRED**.

## Scope boundary

Phase 2C excludes assessments/results, reports, fees, assets, procurement, inventory, notifications, analytics, AI, student authentication and unapproved term/calendar/timetable/lesson systems.

## Gate

```text
PHASE 2C DESIGN — CONDITIONALLY APPROVED
```

Implementation remains blocked by Decisions 1, 2, 5 and the policy portions of Decisions 3, 6 and 8. Phase 2D is **NOT READY** until Phase 2C domain and authorization decisions are approved and implemented.

# Phase 2C — Attendance Readiness Assessment

Status: **READY AFTER DESIGN DECISIONS — NOT APPROVED TO IMPLEMENT**

Phase 2C is limited to attendance. This document is an architecture/readiness assessment, not an implementation record.

The subsequent formal design gate is recorded in `docs/24-phase-2c-attendance.md`. That document and ADR-036 through ADR-039 are authoritative where they refine this readiness assessment.

## Dependency assessment

| Dependency | Classification | Assessment |
|---|---|---|
| Student, staff, class and academic-session identifiers | READY | Stable opaque IDs and restrictive relationships exist. |
| Better Auth actor and S.I.M.S. membership | READY | Server functions derive the actor from the authenticated session. |
| Closed permission catalogue and assignment entitlements | READY | Phase 1B supports class, subject and academic-session scopes without scope borrowing. |
| Runtime-role/schema isolation and append-only audit | READY; OPERATIONAL VERIFICATION PENDING | Tooling exists; live disposable-role evidence remains with the Senior Software Engineer. |
| Historical student-to-class membership/roster | REQUIRES DESIGN DECISION | Phase 2B stores only current class. Attendance must not infer historical membership after reassignment. |
| Daily versus subject/lesson attendance | REQUIRES DESIGN DECISION | This determines ownership, uniqueness, scope and UI. |
| Attendance states | REQUIRES DESIGN DECISION | Present/absent/late/excused or any alternative requires school approval. |
| Term/calendar model | REQUIRES DESIGN DECISION | A scope dimension exists, but no approved term domain exists; Phase 2C must not invent one. |
| Operational Staff mappings and correction authority | REQUIRES DESIGN DECISION | Existing attendance permissions do not define approved resource mappings or correction policy. |

No discovered dependency requires Phase 2B remediation. Historical roster support may be introduced as an explicit Phase 2C dependency after its model is approved.

## DECISION REQUIRED before implementation

1. Attendance unit: once per student/class/date, or per subject/lesson/period.
2. Approved attendance states and whether a reason/note is permitted or required for any state.
3. Historical roster model: time-bounded class enrolment, immutable attendance-time class snapshot, or another approved approach.
4. Whether a term/calendar entity is required in Phase 2C. No term relationship will be inferred from the existing scope dimension.
5. Which roles may record, read and correct attendance, with exact class/subject/session assignment mappings.
6. Correction policy: direct audited replacement, immutable superseding correction, approver requirement, time limit and reason requirement.
7. Whether recorder identity must link to a staff record, or whether the authenticated Better Auth identity is sufficient attribution.
8. Field-level visibility, retention, export and safeguarding rules for attendance and correction reasons.

The single-active-academic-session decision can remain deferred if every attendance operation explicitly references one session and the selected class belongs to that session.

## Proposed architecture after approval

### Domain and database

- Add only attendance-specific tables under `sims` in the next numbered migration.
- Use an attendance occurrence/register header containing academic session, class, date and—only if approved—subject/lesson context.
- Use one student attendance entry per approved occurrence uniqueness rule.
- Preserve the class/session context on the attendance record rather than deriving historical facts from the student's mutable current class.
- Prefer an immutable correction chain (`supersedes_entry_id`, actor, reason, timestamp) or equivalent event history. Do not add an approval workflow unless policy requires it.
- Use restrictive foreign keys, bounded indexes for class/session/date queries, no destructive runtime DELETE and the existing `slgs_sims` runtime/RLS boundary.

### Authorization and audit

- Continue the existing `domain:action[:scope]` catalogue; add only approved attendance actions such as read, record/update and correct.
- Keep School/System Administrator and Operational Staff authority explicit; Access Administrator receives no attendance access by implication.
- Evaluate class, subject and academic-session scope on the server and in repository SQL. Do not use organisation, department or term without an approved relationship.
- Audit register creation/finalization, entry changes, corrections and authorization denials in `identity.security_audit_event` with sanitized metadata.

### Services and server functions

- Add typed attendance repository/service boundaries in `@slgs/sims-domain`.
- Derive actor exclusively from Better Auth; never accept browser actor, role or scope claims.
- Validate the occurrence, roster membership, state, uniqueness and correction rule transactionally with its audit event.
- Return generic authorization/not-found behavior without exposing out-of-scope student attendance.

### UI

- Proposed routes: `/attendance`, `/attendance/new`, `/attendance/$id` and an explicitly authorized correction view.
- Provide class/session/date selection, bounded roster loading, keyboard-operable marking, clear validation/unsaved-state feedback and mobile/desktop layouts.
- Do not expose reports, analytics or assessment/results views.

### Verification

- Domain tests: uniqueness, roster/date/session consistency, every approved state, scope separation, correction history and audit atomicity.
- Authorization tests: no membership, inactive/revoked access, Access Administrator denial, School/System boundaries, Operational Staff same-scope success and cross-scope denial.
- Database verifier: effective `slgs_sims` grants/RLS, CMS/Web denial, no DELETE, constraints and rolled-back synthetic attendance/correction history.
- Application tests: authenticated route protection, role-aware controls, direct server-function denial, validation, correction confirmation and bounded roster behavior.
- Senior Engineer browser gate: approved personas on a disposable branch, desktop/mobile keyboard/accessibility checks, audit inspection and branch cleanup.

## Scope boundary

Phase 2C will not implement assessments, examination results, reports, fees, assets, procurement, inventory, notifications, analytics, AI, student authentication, or an unapproved term/lesson/timetable model.

## Readiness conclusion

The Phase 2B technical foundation is sufficient. Phase 2C implementation must wait for the eight decisions above; privileged Phase 2B operational verification may proceed independently and is not an architecture blocker.

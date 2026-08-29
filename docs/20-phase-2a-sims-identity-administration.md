# Phase 2A — S.I.M.S. Identity and Administration Foundation

Status: **PHASE 2A — CONDITIONALLY CLOSED**

Phase 0, 1A and 1B remain closed. Phase 1C and 1D remain conditionally closed. This phase does not implement attendance, students, classes, assessments, assets or any other operational S.I.M.S. domain.

## Ownership and boundaries

**Identity lifecycle is S.I.M.S.-owned.** `apps/sims` is the administrative application for staff/platform identity provisioning, activation, suspension, deactivation, reactivation and session revocation. Better Auth remains the only authentication system and `@slgs/permissions` remains the only authorization evaluator.

An identity is shared authentication infrastructure. CMS and S.I.M.S. memberships and role assignments remain independent application records. S.I.M.S. provisioning does not create CMS membership or CMS roles. CMS continues to own its membership/role configuration and has no global identity-management subsystem.

Students do not receive authenticating platform identities in Phase 2A. A future student record must remain distinct from an authentication identity.

## Lifecycle services

Every lifecycle operation receives the authenticated `SessionIdentity` derived server-side from Better Auth. Browser-supplied actor, role, membership and scope claims are not accepted. The service requires an active identity, active S.I.M.S. membership, active assignment and the applicable permission before its transaction changes state.

Provisioned staff identities start `pending`. Activation/reactivation, suspension and deactivation are explicit audited transitions. Suspending or deactivating an identity, or suspending/deactivating its S.I.M.S. membership, revokes all sessions. Deactivation preserves identity and audit history.

The administrative UI returns only opaque ID, display name, approved contact identifier, lifecycle status, timestamps, S.I.M.S. membership, S.I.M.S. assignments/scopes and authorized audit history. It never returns password hashes, tokens, TOTP material or recovery material.

Identity evidence remains optional. `person_reference` is an opaque association/extension point; it is not proof that a school-approved evidence process occurred.

## Role separation

- S.I.M.S. System Administrator: identity lifecycle, S.I.M.S. role definitions, configuration and S.I.M.S. audit visibility. It does not inherit role-assignment authority.
- S.I.M.S. Access Administrator: reads S.I.M.S. membership state and assigns/revokes active approved S.I.M.S. roles. It cannot define roles or manage identity lifecycle.
- School Administrator: retains only the closed school-level read/assignment catalogue. Phase 2A exposes no student or school-record UI.
- Operational Staff: retains explicitly bound assignment scopes and no delete permission. A scoped role assignment is rejected when no explicit allowed scope is supplied.

System-managed roles cannot be deactivated through the custom-role service. The five-active-S.I.M.S.-System-Administrator database constraint remains authoritative.

## UI and server functions

`/admin/identities` provides the Phase 2A identity list/detail information, lifecycle history, membership controls, session revocation, approved role assignment/revocation and visible feedback. `/admin/roles` provides S.I.M.S. role-definition visibility and System-Administrator-only custom role creation/activation/deactivation. The consolidated identities route is the project convention for the membership area and individual expandable identity detail in this phase.

Role-aware rendering is usability only. All reads and mutations re-establish the authenticated identity and enforce permissions server-side. Failures return generic application messages.

## Audit and database isolation

Migration `0009_phase-2a-identity-audit-hardening.sql` makes `identity.security_audit_event` append-only with a PostgreSQL trigger and removes UPDATE/DELETE from application and platform-administration roles. Audit RLS allows `slgs_sims` to read S.I.M.S. and shared identity events but not CMS audit events. `slgs_sims` retains only SELECT/INSERT on audit records.

Migration `0010_phase-2a-sims-identity-ownership.sql` removes identity provisioning/lifecycle writes from `slgs_cms`. CMS retains shared identity/credential reads and the account update needed for password recovery, but cannot insert or update identities or insert credential accounts. S.I.M.S. remains the sole application runtime with staff lifecycle authority.

The Phase 2A runtime verifier connects using `SIMS_DATABASE_URL`, tests insert/read, CMS-row invisibility, immutable UPDATE/DELETE behavior and effective grants, and rolls its synthetic transaction back. Phase 1A verification separately rechecks cross-application assignment rejection, the five-administrator ceiling and session revocation.

## Disposable fixture strategy

`pnpm --filter @slgs/auth fixtures:phase2a-browser create` creates deterministic synthetic S.I.M.S. System Administrator, Access Administrator, School Administrator and scoped Operational Staff personas. It requires `SLGS_PHASE2A_BROWSER_FIXTURES=1`, Neon project/branch IDs and API key, a migration URL, and an environment-only synthetic password.

The Neon API must verify an expiring, unprotected, non-default branch whose name starts `phase2a-`. The fixture transaction writes no credential to logs. Direct low-level creation is isolated to this test CLI and is not an application provisioning path. Branch deletion is primary cleanup (`... fixtures:phase2a-browser cleanup`) and TTL is fallback. Phase 2A has no media fixture, so no R2 cleanup is required.

## Return hook for deferred Phase 1 gates

The disposable branch mechanism can host independently assigned CMS personas without changing identity ownership. It enables later CMS System Administrator, CMS Administrator, Multimedia member/supervisor, News Journal member/supervisor, Editor, Reviewer, Approver and Publisher browser tests. Those tests do not close during Phase 2A.

## DECISION REQUIRED

The first S.I.M.S. Access Administrator bootstrap is resolved by ADR-029 using the existing two-person Platform System Administration ceremony.

1. Select identity evidence requirements and the approving school office; evidence is optional until then.
2. Decide whether/when MFA becomes mandatory for privileged roles and approve recovery handling.
3. Approve operational staff scope assignments and sensitive-field rules before operational modules begin.
4. Set audit retention/export schedules and name the incident-response contact/escalation timetable.
5. Set reactivation approval, inactivity/concurrent-session limits and administrative notification providers.

## Verification record

- Auth tests: 39 passing after role-scope, role-lifecycle, role-separation and Access Administrator bootstrap additions.
- S.I.M.S. tests: policy and safe login rendering passing.
- S.I.M.S./auth/database TypeScript and ESLint focused checks: passing.
- Disposable Neon migration `0009`: applied successfully.
- `slgs_sims` runtime isolation verifier: passing, transaction rolled back.
- Phase 1A database regression verifier: passing, transaction rolled back.
- Full repository format, lint, TypeScript, unit/domain test and build gate: passing (87 tests passed; one opt-in R2 integration test skipped).
- Browser verification confirms labelled login, generic authentication failure, keyboard focusability and a 390-pixel layout without horizontal overflow.
- Authenticated lifecycle/role browser matrix and fixture creation/cleanup: pending before Phase 2A can be closed.

The authenticated final gate must use a new `phase2a-*` branch. The old Phase 1C branch is prohibited. Until branch creation is approved/completed, no Phase 2A fixture records or R2 objects exist to clean up. The S.I.M.S. browser remains at the login boundary awaiting a synthetic administrator session; server/domain evidence is not recorded as a browser pass.

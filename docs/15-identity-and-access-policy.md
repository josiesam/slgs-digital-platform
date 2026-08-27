# Identity and Access Policy

Status: Accepted for Phase 1A

This policy governs identity, authentication, sessions and the initial authorization boundary. It does not approve CMS workflow or S.I.M.S. business-domain rules.

## Security concepts

1. **Identity** is one approved, traceable person represented by one SLGS user record. Shared accounts are prohibited. A unique opaque person reference links approval evidence without storing school records in the auth schema.
2. **Authentication** proves control of an identity's credential. Phase 1A uses Better Auth email/password. Public registration and social login are disabled.
3. **Session** is revocable, server-validated authentication state. It expires absolutely after eight hours.
4. **Role** is an application-specific job-function bundle. It belongs to exactly one application.
5. **Permission** is an SLGS-owned `domain:action[:scope]` capability, denied by default and checked server-side.
6. **Application scope** is `cms` or `sims`. Authentication alone grants neither; an active matching membership is mandatory.
7. **Record/data scope** limits access to `own`, `club`, `assigned`, `approved`, `published`, or `school` data. Exact S.I.M.S. assignment rules are `DECISION REQUIRED` before Phase 1B.
8. **Auditability** makes security events attributable, timestamped, immutable and outcome-bearing. Passwords, reset tokens, MFA secrets, backup codes and session-cookie values are forbidden in audit data.

## Access boundary

The public website needs no identity for published public content and receives no private memberships.

CMS requires an active identity and active `cms` membership. Eligible identities are approved Multimedia Club and News Journal Club members, editors, reviewers, approvers, publishers, CMS administrators, and other identities explicitly approved for a CMS role.

S.I.M.S. requires an active identity and active `sims` membership. Eligible identities are approved School Administrators, Access Administrators, System Administrators, and future operational staff explicitly approved for a S.I.M.S. role.

Memberships and role assignments are independent. A person may hold both only through two explicit approvals. A CMS role has `application = cms`; assignment controls reject attaching it to a S.I.M.S. membership, and session loading selects roles only for the requested application. Thus CMS roles cannot inherit or produce S.I.M.S. permissions.

## Roles and justification

- **Public visitor**: no role; reads explicitly published public content.
- **Multimedia Club**: creates/updates own media and content and reads club-scoped work. Which identities are supervisors is `DECISION REQUIRED`.
- **News Journal Club**: creates/updates own articles, events and announcements, then submits them for moderation.
- **CMS Editor**: edits assigned content; this does not grant review, approval or publication.
- **CMS Reviewer**: reviews/rejects assigned content and cannot review their own work.
- **CMS Approver**: approves/rejects assigned reviewed content. Eligible approvers are `DECISION REQUIRED`.
- **CMS Publisher**: publishes only approved content, preserving four-eyes control.
- **CMS Administrator**: manages CMS membership/configuration and CMS audit access; never S.I.M.S. access by implication.
- **School Administrator**: receives minimum S.I.M.S. oversight reads and assignment management, not unrestricted CRUD/delete.
- **S.I.M.S. Access Administrator**: assigns/revokes approved roles but cannot define roles.
- **S.I.M.S. System Administrator**: manages S.I.M.S. identity/configuration and role definitions. This technical role is not a business-domain superuser. At most five identities may be active in it.
- **S.I.M.S. Operational Staff**: future assignment-scoped read/update role, never delete by default. Exact variants/scopes are `DECISION REQUIRED`.

## Proposed permission matrix

| Role | App | Permissions |
| --- | --- | --- |
| Multimedia Club | CMS | `media:create:own`, `media:read:club`, `media:update:own`, `content:create:own`, `content:read:club`, `content:update:own`, `content:submit:own` |
| News Journal Club | CMS | `article:create:own`, `article:read:club`, `article:update:own`, `article:submit:own`, `event:create:own`, `event:update:own`, `announcement:create:own`, `announcement:update:own` |
| CMS Editor | CMS | `content:read:assigned`, `content:update:assigned`, `content:submit:assigned` |
| CMS Reviewer | CMS | `content:read:assigned`, `content:review:assigned`, `content:reject:assigned` |
| CMS Approver | CMS | `content:read:assigned`, `content:approve:assigned`, `content:reject:assigned` |
| CMS Publisher | CMS | `content:read:approved`, `content:publish:approved`, `content:unpublish:published` |
| CMS Administrator | CMS | `membership:read:cms`, `membership:manage:cms`, `audit:read:cms`, `configuration:manage:cms` |
| School Administrator | SIMS | `student:read:school`, `staff:read:school`, `attendance:read:school`, `assessment:read:school`, `report:read:school`, `assignment:manage:school` |
| Access Administrator | SIMS | `membership:read:sims`, `role:assign:approved`, `role:revoke:approved`, `audit:read:identity` |
| System Administrator | SIMS | `identity:manage:sims`, `role:create:sims`, `role:update:sims`, `role:deactivate:sims`, `configuration:manage:sims`, `audit:read:sims` |
| Operational Staff | SIMS | `student:read:assigned`, `student:update:assigned`, `attendance:read:assigned`, `attendance:update:assigned` |

These are minimal role contracts, not approval of full domain authorization. Role composition, data scopes and sensitive-field access remain Phase 1B decisions.

## Lifecycle policy

### Administrator bootstrap

Platform System Administration records the first CMS and S.I.M.S. administrator requests. Completion requires two distinct human approvers and records initiator, approver, target, application, role, timestamps, outcome and reason. Credentials are excluded. Platform operators gain no business access by performing bootstrap.

### Provisioning and approval

Accounts are individually provisioned; public sign-up is disabled. Provisioning requires an approved contact domain plus identity evidence/account approval. Domains are configuration controlled by an authorized Domain System Administrator. Accepted evidence, approving office and service target are `DECISION REQUIRED`.

### Suspension and deactivation

Pending, suspended and deactivated identities cannot create or use sessions. Membership suspension removes one application's access only. Identity suspension/deactivation revokes all sessions. Deactivation preserves audit history rather than deleting records. Reactivation authority and retention are `DECISION REQUIRED`.

### Password recovery

Recovery uses Better Auth expiring one-time tokens, enumeration-resistant responses and the Resend adapter. A reset revokes sessions. Events exclude token, URL and password values. The exact verified sending domain and support/escalation process remain `DECISION REQUIRED`.

### MFA and sessions

Better Auth TOTP support is enabled but optional. Mandatory roles, grace period and recovery are `DECISION REQUIRED`. Sessions have an absolute eight-hour lifetime and support revocation on logout, reset and lifecycle changes. Cookies must be secure, HTTP-only and same-site for the deployed origins. Concurrent-session and shorter inactivity limits are `DECISION REQUIRED`.

### Authorization failures

Unauthenticated browser requests go to the relevant login; APIs return generic `401`. Authenticated users lacking matching membership/permission receive generic `403`. Responses do not disclose identities, memberships or confidential records. Sensitive denials are audited.

## Audit requirements

Audit login/logout/failure, recovery initiation/completion, activation/suspension/deactivation, bootstrap initiation/approval/outcome, membership/role assignment/revocation, and security configuration changes. Record type, time, actor when known, application, target reference, outcome, stable reason code and sanitized metadata. Audit retention, export controls, monitoring and incident response are `DECISION REQUIRED`.

## Decisions required from the project owner

1. Accepted identity evidence and approving school office.
2. Allowed contact domains and the Domain System Administrator.
3. Named CMS approvers and club supervisors.
4. Operational S.I.M.S. roles, assignment scopes and sensitive-field access.
5. Verified Resend sending domain and recovery escalation owner.
6. Roles requiring MFA, enrollment deadline and recovery.
7. Reactivation authority, retention, concurrent sessions and idle timeout.
8. Audit viewers, retention/export, alerts and incident-response owner.

## Security risks

- Recovery delivery remains unavailable until the Resend domain and deployment secrets are configured; it fails closed.
- Optional MFA leaves privileged accounts exposed until enforcement is approved.
- Incorrect database grants could undermine logical isolation.
- The five-admin ceiling needs transactional database enforcement to prevent races.
- Ambiguous record scopes could expose confidential data in Phase 1B.
- Bootstrap approvers require independent verification to avoid circular trust.

## Recommended Phase 1B plan

1. Resolve evidence, MFA, recovery and operational-role decisions.
2. Implement transactional provisioning, approvals, memberships, assignments, lifecycle transitions and audit writes.
3. Enforce application/role matching and the five-admin limit in PostgreSQL and services.
4. Define/test record-scope evaluators for every domain permission.
5. Add privileged UI only after server authorization is complete.
6. Integrate mail, recovery, MFA and operational monitoring.
7. Verify database grants, rate limits, cookies and end-to-end application isolation.

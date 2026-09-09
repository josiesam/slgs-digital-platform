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

Status: Accepted

Use PostgreSQL for relational integrity and Drizzle for typed database access/migrations.

## ADR-004 — Better Auth

Status: Accepted

Use Better Auth unless requirements or deployment constraints require another authentication system.

## ADR-005 — Asset history is event-oriented

Status: Accepted

Do not model asset allocation/maintenance/repair/disposal only as mutable fields on the asset row. Preserve historical records.

## ADR-006 — Student content requires moderation

Status: Accepted

Student club content should follow a draft/review/approval/publish workflow.

## ADR-007 — pnpm workspaces with Turborepo

Status: Accepted

Use pnpm workspaces for dependency management and Turborepo for the repository task graph.

Reason:
- pnpm provides deterministic workspace dependency resolution and efficient installs;
- Turborepo provides a small, explicit task graph without changing application boundaries;
- both tools support independently buildable applications and shared packages.

The repository pins pnpm through `packageManager` and its Node.js line through `.nvmrc` and `engines`.

## ADR-008 — TanStack Start on a portable Node baseline

Status: Accepted for Phase 0

All three applications use TanStack Start with Vite and React. Phase 0 targets a portable Node.js production build rather than a provider-specific runtime.

Reason:
- the production hosting provider has not been selected;
- provider-specific adapters must not force a database or storage choice;
- Node-compatible deployments support PostgreSQL drivers and preserve future hosting options.

The final hosting provider, regions, service levels, and production adapter remain deployment decisions. A provider change requires build and security verification for all three applications.

## ADR-009 — One PostgreSQL service with isolated schemas and runtime roles

Status: Accepted for initial development; production review required

Start with one PostgreSQL service organized into logical schemas. Use distinct runtime credentials for Web, CMS, and S.I.M.S., plus a separate migration credential.

Rules:
- Web receives read-only access only to an explicit published-content read model.
- CMS credentials cannot read S.I.M.S. schemas.
- S.I.M.S. credentials do not imply CMS administration rights.
- migration credentials are never application runtime credentials.
- database packages expose scoped repositories rather than unrestricted cross-domain access.

Reason:
This keeps local development and migrations manageable while making the security boundary enforceable at both application and database levels. Before production, privacy, hosting, backup, and operational requirements must confirm whether S.I.M.S. needs a separate PostgreSQL service.

## ADR-010 — Shared identity, application-scoped authorization

Status: Accepted for Phase 0

Use one identity model so a person can authenticate consistently, but grant access through independent application memberships, roles, and permissions.

Authentication answers who the user is. Authorization answers what that identity may do in a specific application. No global administrator role grants access across CMS and S.I.M.S.

Better Auth provides session and account infrastructure. SLGS-owned permission checks use explicit `domain:action[:scope]` values, deny by default, and run on the server.

## ADR-011 — Phase 0 contains infrastructure, not business domains

Status: Accepted

Phase 0 may establish application shells, shared UI primitives, validated environment contracts, database connectivity, authentication interfaces, authorization primitives, tests, and CI. It must not implement CMS content types, student/staff records, attendance, results, or asset workflows.

Reason:
The detailed business rules and fields remain unresolved. Creating those schemas during foundation work would silently turn assumptions into migrations.

## ADR-012 — Better Auth owns authentication; SLGS owns authorization

Status: Accepted

Better Auth owns credentials, recovery tokens, sessions and optional TOTP. SLGS owns lifecycle, application memberships, roles, bootstrap and audit. Better Auth's global administrator role is not used.

## ADR-013 — Individual identities and controlled provisioning

Status: Accepted

Public registration and shared accounts are prohibited. Each identity has a unique opaque person reference and an approved contact domain. Identity evidence is optional for now; evidence requirements and approvers remain `DECISION REQUIRED`.

## ADR-014 — Absolute eight-hour sessions

Status: Accepted

Sessions expire after eight hours without sliding extension. Reset, suspension and deactivation revoke applicable sessions. Idle/concurrent limits remain `DECISION REQUIRED`.

## ADR-015 — Optional TOTP foundation

Status: Accepted for Phase 1A

Better Auth TOTP and its schema are enabled, but enrollment is optional until mandatory roles and recovery policy are approved.

## ADR-016 — Two-person privileged bootstrap

Status: Accepted

The first administrator for either private application requires two distinct approvers and an auditable outcome. Platform operation does not imply business access.

## ADR-017 — S.I.M.S. System Administrator ceiling

Status: Accepted

At most five identities may hold an active S.I.M.S. System Administrator assignment. Transactional database enforcement is required before production.

## ADR-018 — Security audit foundation

Status: Accepted

Security events are attributable and outcome-bearing. Credentials, recovery/session secrets, MFA secrets and backup codes are forbidden from audit metadata.

## ADR-019 — Neon PostgreSQL provider

Status: Accepted; environment verification pending

Neon is the PostgreSQL provider for development/staging verification and the initial production baseline. Runtime applications use pooled, separately granted credentials; Drizzle migrations use a direct migration-only credential. Provider selection does not weaken schema, runtime-role or application isolation from ADR-009.

## ADR-020 — Resend transactional identity email

Status: Accepted; domain verification pending

Resend delivers Better Auth password-recovery email through the shared `@slgs/auth` boundary. Missing configuration or provider failure fails closed. Recovery URLs, tokens and API keys must never be logged or audited. Production delivery requires an explicitly selected and verified sending domain.

## ADR-021 — Assignment-scoped, catalogue-based authorization

Status: Accepted for Phase 1B

SLGS authorization uses a closed `domain:action[:scope]` catalogue and one deny-by-default evaluator in `@slgs/permissions`. Scopes remain attached to the role assignment granting the permission. PostgreSQL row-level policies reinforce CMS/S.I.M.S. isolation for memberships, roles, assignments and scopes.

This prevents scope borrowing, rejects arbitrary permissions and lets later school-policy assignments use the same technical mechanism.

## ADR-022 — Normalized CMS workflow with guarded publication

Status: Accepted and infrastructure-verified for Phase 1C; application gate pending

CMS content uses normalized PostgreSQL records with immutable revisions, append-only workflow events and editorial audit events. The state machine is enforced in the CMS service and reinforced by a database trigger. Author, owning club and publication actors are persisted historical facts. Pages, articles, events, announcements and galleries share the workflow boundary without becoming a general-purpose page builder.

Club scope values are data managed by explicitly assigned club leadership. CMS System Administrators manage CMS-only custom roles and normal assignments do not require second-person approval. Routine authorization denials are persisted with sanitized metadata.

Binary media uses a server-only object-storage interface. Browser clients never receive storage credentials.

## ADR-023 — Cloudflare R2 private CMS media storage

Status: Accepted for Phase 1C

Cloudflare R2 is the production object-storage provider for CMS media and implements the existing provider-neutral `CmsObjectStorage` contract through its S3-compatible API. The bucket is private. Authenticated and authorized CMS server functions create short-lived presigned PUT and GET URLs; object keys are opaque and server-generated. PostgreSQL remains authoritative for ownership, club scope, lifecycle, relationships and audit history.

Direct uploads remain untrusted until server finalization checks R2 metadata and object bytes, verifies size/MIME/signature agreement and records a SHA-256 checksum. Archive retains the object and changes audited database state; physical deletion requires a later privileged retention procedure. Public delivery and custom-domain decisions belong to Phase 1D.

Exact bucket naming, environment/account separation, URL lifetime, scanning, retention, recovery and monitoring are `DECISION REQUIRED — OPERATIONAL DETAIL` and do not reopen provider selection.

Live verification on 2026-08-28 confirmed bucket connectivity, effective restricted-origin CORS, presigned upload/download, private anonymous denial, server finalization, checksum, audit, archive and failure handling. Synthetic objects were removed after the database fixtures rolled back.

## ADR-024 — Security-barrier public content projections

Status: Accepted and database-verified for Phase 1D

The public Web reads only dedicated PostgreSQL views in the `public_content` schema through the restricted `slgs_web` role and the typed `@slgs/public-content` package. Views enforce published state and required publication timestamps before projecting a minimal public DTO. Web receives no CMS, identity or S.I.M.S. schema privilege and no mutation privilege.

An infrastructure-neutral 60-second in-process cache stores only already-projected public DTOs. This provides bounded eventual publication propagation without coupling independent deployments to a provider-specific invalidation service. A future production cache may replace it while preserving the database publication boundary.

Private R2 media is not projected. Public media delivery remains an operational decision and must use a URL-safe public DTO without revealing object keys or granting anonymous access to the private CMS bucket.

The read views and runtime grants passed live synthetic verification. The approved production public origin is `http://slgs.edu.sl`; `PUBLIC_SITE_URL` and application-generated canonical, Open Graph, sitemap and robots URLs were verified against that exact origin. Phase 1D remains conditionally closed until CMS-to-Web publish/unpublish is browser-verified.

Domain/DNS/hosting control remains **PENDING INFRASTRUCTURE HANDOVER** from the previous team. This operational dependency does not reopen Phase 1D. HTTPS, redirects, secure-cookie deployment behavior and HSTS must be verified separately after handover; HTTPS is not assumed before then.

## ADR-025 — First CMS System Administrator bootstrap

Status: Accepted

Phase 1A privileged bootstrap currently assigns `cms_administrator`. Phase 1C reserves CMS role creation and assignment to `cms_system_administrator`. The result is a circular authority boundary with no approved path to provision the first CMS System Administrator.

The existing two-person Platform System Administration bootstrap is extended to explicitly select the first `cms_system_administrator`. Existing CMS administrators are not elevated and do not gain role-management authority. The operation creates only the requested CMS identity, active CMS membership and CMS System Administrator assignment in one transaction; records both distinct external platform operator references in append-only security audit history; and rejects a second pending or completed request for the same initial role.

Platform System Administration remains an external operational authority rather than an application role. Independent operator authentication and authorization govern access to the scoped platform-administration database credential. The CLI enforces distinct operator references as separation evidence and never grants S.I.M.S. authority through the CMS path. Normal CMS role assignment remains restricted to CMS System Administrators.

## ADR-026 — S.I.M.S.-owned shared identity lifecycle

Status: Accepted for Phase 2A

S.I.M.S. owns administrative lifecycle operations for shared staff identities. CMS owns CMS membership, role definition and assignment only and does not gain global user management. Application membership and role assignment remain independent; neither private application creates or inherits the other's access. Students do not authenticate in Phase 2A.

The actor is derived from the Better Auth session and evaluated through the shared deny-by-default permission layer. At the time of ADR-026, the production ceremony for the first S.I.M.S. Access Administrator remained `DECISION REQUIRED`; ADR-029 resolves it without weakening role separation.

## ADR-027 — Database-enforced immutable security audit

Status: Accepted and runtime-verified for Phase 2A

`identity.security_audit_event` is append-only at PostgreSQL level. Application and platform-administration roles have no UPDATE/DELETE grant and an immutable trigger provides defense in depth. Audit RLS prevents the S.I.M.S. runtime from reading CMS events while permitting authorized S.I.M.S./shared identity audit visibility.

## ADR-028 — API-verified disposable identity fixtures

Status: Accepted for Phase 2A; browser verification pending

Synthetic identity fixtures may run only after the Neon API confirms an expiring, unprotected, non-default `phase2a-*` branch. Credentials remain environment-only and are never logged. Fixture creation is transactional; branch deletion is primary cleanup and TTL is fallback. Direct fixture insertion is isolated to the test CLI and is not an application provisioning path.

## ADR-029 — First S.I.M.S. Access Administrator bootstrap

Status: Accepted for Phase 2A

The existing two-person Platform System Administration bootstrap may explicitly provision the first `sims_access_administrator`. This is a one-time initial-role ceremony governed by the same approved contact-domain validation, distinct external operator references, transaction and append-only audit history as the existing privileged bootstrap.

The default S.I.M.S. bootstrap remains `sims_system_administrator`. The Access Administrator receives only its existing closed role contract and no System Administrator permission. The mechanism creates no CMS membership, does not grant either S.I.M.S. role the other's authority, creates no permanent application bypass, and does not affect the five-active-System-Administrator database limit. Subsequent assignments continue through normal Access Administrator authorization.

## ADR-030 — Least-privilege verification ownership

Status: Accepted

Codex / Development Agent owns architecture, implementation, migrations, automated tests, fixture and verification tooling, browser specifications, security review and authoritative engineering documentation. The Senior Software Engineer / Project Owner owns production/live secrets, authenticated infrastructure and browser execution, environment configuration, cleanup and operational sign-off.

An agent's lack of access to privileged credentials is not an implementation defect. Phase reporting separates implementation, automated engineering verification, privileged operational verification and production readiness. Operational evidence is exchanged only as sanitized outputs, screenshots and pass/fail summaries; raw credentials, connection strings, session material and private keys are never required in chat.

This boundary applies least privilege to humans and agents and does not weaken any application or database control. The authoritative procedure and ownership matrix are in `docs/21-operational-verification-runbook.md`.

## ADR-031 — Administrative people records are not authentication identities

Status: Accepted for Phase 2B

Student and staff administrative records live in the private S.I.M.S. domain. A student has no Better Auth relationship or credential in Phase 2B. A staff record may optionally reference one existing Better Auth identity explicitly; it never duplicates a password, session, recovery or MFA secret.

## ADR-032 — Session-scoped academic classes and subjects

Status: Accepted for Phase 2B; subject long-term policy review required

Academic classes and subjects reference an academic session. Their codes are unique within that session rather than globally, preserving recurring class/subject labels without conflating years. Student current-class is optional. Enrolment, teacher allocation, attendance and assessment relationships are deferred. Whether subjects should later have a session-independent catalogue is `DECISION REQUIRED` before Phase 2C relies on it.

## ADR-033 — Non-destructive S.I.M.S. core lifecycle

Status: Accepted for Phase 2B

Students, staff, classes and subjects use active/inactive/archived states; sessions use planned/active/closed. Application runtime roles receive no DELETE permission. Historical referential integrity uses restrictive foreign keys. Reactivation/retention approval is `DECISION REQUIRED`.

## ADR-034 — Phase 2B school-wide authority and unresolved operational scopes

Status: Accepted for Phase 2B

S.I.M.S. System and School Administrators receive the approved school-wide read/create/update core catalogue. Access Administrators receive no core-record authority. Operational Staff retain only existing assigned student read/update; no new staff/class/subject/session mapping is inferred until school approval. Assignment scope filtering executes server-side and each entitlement retains its own scope.

## ADR-035 — Minimal confidential S.I.M.S. fields and isolated runtime schema

Status: Accepted for Phase 2B

The initial model stores only identifiers, names, lifecycle, essential dates/relationships, optional staff contact email and optional staff identity linkage. Date of birth, guardian/contact, department and other sensitive attributes remain absent pending approved purpose, visibility and retention rules. The `sims` schema is available only to `slgs_sims` with SELECT/INSERT/UPDATE; CMS/Web receive no privilege and no public projection exists.

## ADR-036 — Attendance preserves attendance-time class context

Status: Accepted and implemented for Phase 2C

Attendance history must not be derived from the student's mutable current class. Each occurrence and entry preserves its academic-session/class context and immutable student roster association. Phase 2C may add the minimum historical roster structure required by the approved attendance model without reopening Phase 2B. Roster admission/removal policy remains `DECISION REQUIRED`.

## ADR-037 — No mandatory term/calendar subsystem for Phase 2C

Status: Accepted and implemented for Phase 2C

Academic session, class and attendance date are sufficient technical anchors for the Phase 2C baseline. The existing `term` scope dimension is not a term domain model and must not be used as one. A term/calendar dependency may be added only if school policy requires it.

## ADR-038 — Attendance corrections preserve original evidence

Status: Accepted and implemented for Phase 2C

Attendance corrections use immutable superseding evidence rather than destructive overwrite or deletion. The correction records actor identity, timestamp and the superseded entry/version. Corrector roles, mandatory reason, time limit and approval requirements remain `DECISION REQUIRED`.

## ADR-039 — Authenticated recorder with optional staff attribution

Status: Accepted and implemented for Phase 2C

Every attendance write is attributed to the authenticated Better Auth identity derived server-side. Where that identity has an explicit Phase 2B staff link, attendance may also preserve the staff ID. A staff record is not authentication authority, and absence of a staff link cannot be silently replaced by a browser-supplied staff or actor ID.

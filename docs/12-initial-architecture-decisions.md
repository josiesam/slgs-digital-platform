# Initial Decisions to Confirm

This list records both resolved foundation choices and product or production decisions that remain open. Accepted choices are documented in `docs/10-decision-log.md`.

1. Package manager/workspace tooling — resolved for Phase 0: pnpm workspaces + Turborepo (ADR-007).
2. Exact TanStack Start version and deployment model — rolling dependency version with a portable Node baseline; production provider remains open (ADR-008).
3. Better Auth configuration — email/password selected; public sign-up disabled; optional TOTP and absolute eight-hour sessions accepted. Email delivery and mandatory-MFA policy remain open (ADR-004, ADR-010, ADR-012–ADR-015).
4. PostgreSQL provider — Neon selected; live branch migration verification pending (ADR-019).
5. Object storage provider — Cloudflare R2 selected, provisioned and smoke-tested behind the provider-neutral CMS boundary. Public media delivery remains `DECISION REQUIRED — PUBLIC MEDIA DELIVERY` (ADR-023).
6. One database versus future database separation — one service with isolated schemas/roles for initial development; production separation review required (ADR-009).
7. Backup/disaster recovery policy.
8. Email provider — Resend selected; sending-domain verification and recovery delivery test pending (ADR-020).
9. Observability/privacy configuration.
10. School data retention requirements.
11. Offline/PWA scope.
12. QR/barcode approach.
13. Exact CMS approvers.
14. Additional SLGS student/staff sensitive fields, field-level visibility and retention. Phase 2B accepts only the minimal fields in ADR-035.
15. Whether fees are in the first S.I.M.S. release.

Codex must not silently decide these when implementation materially depends on them.

## Additional unresolved decisions

- Production hosting provider, region and service-level requirements.
- Supported browser policy and performance budgets.
- CI repository host if GitHub Actions is not authoritative.
- Identity evidence/approvers, recovery email delivery, mandatory MFA roles and operational support remain open; controlled provisioning and two-person bootstrap are accepted.
- CMS preview-domain strategy. Public publication uses security-barrier read views and bounded 60-second revalidation; production cache-provider selection remains open.
- Exact audit-retention duration, export controls and named incident-response contact remain `DECISION REQUIRED — OPERATIONAL DETAIL`; retention and Security/Platform System Administration ownership are accepted.
- Whether CMS media and private S.I.M.S. documents use separate storage buckets.
- AUTH-001 remains open for S.I.M.S. operational scopes. AUTH-002 through AUTH-006 are resolved for CMS by ADR-022 and `docs/18-phase-1c-cms-workflow.md`.
- First CMS System Administrator provisioning is resolved by ADR-025: the existing two-person Platform System Administration bootstrap may explicitly provision the first `cms_system_administrator` without elevating `cms_administrator` or affecting S.I.M.S.
- First S.I.M.S. Access Administrator provisioning is resolved by ADR-029: the same two-person Platform System Administration bootstrap may explicitly provision the first `sims_access_administrator` without changing System Administrator permissions, CMS access or the five-System-Administrator limit.
- Verification ownership is resolved by ADR-030: Codex owns implementation/tooling/documentation while the Senior Software Engineer owns secrets, privileged execution, cleanup and operational sign-off. Sanitized evidence, never credentials, crosses that boundary.
- Phase 2B operational-role mappings, single-active-session policy, staff organisation model, long-term subject/session model and archival/reactivation authority remain `DECISION REQUIRED`. ADR-031 through ADR-035 preserve safe defaults until approval.
- Phase 2C attendance decisions on daily class registers, baseline states, roster history, correction authority, and role/scope visibility have been approved and implemented.
- Phase 2C technical decisions are implemented via ADR-036 through ADR-039. The design gate is closed and implementation is complete as of 2026-08-31.

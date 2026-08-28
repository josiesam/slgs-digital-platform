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
14. Exact SLGS student/staff fields.
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

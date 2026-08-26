# Initial Decisions to Confirm

This list records both resolved foundation choices and product or production decisions that remain open. Accepted choices are documented in `docs/10-decision-log.md`.

1. Package manager/workspace tooling — resolved for Phase 0: pnpm workspaces + Turborepo (ADR-007).
2. Exact TanStack Start version and deployment model — rolling dependency version with a portable Node baseline; production provider remains open (ADR-008).
3. Better Auth configuration — selected for identity/session infrastructure; providers, MFA and recovery policy remain open (ADR-004, ADR-010).
4. PostgreSQL provider — open.
5. Object storage provider — open.
6. One database versus future database separation — one service with isolated schemas/roles for initial development; production separation review required (ADR-009).
7. Backup/disaster recovery policy.
8. Email provider.
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
- Identity provisioning, account recovery, MFA and privileged access policy.
- CMS preview-domain and cache-invalidation strategy.
- Public-content source before the CMS phase is complete.
- Audit retention, export controls and incident-response policy.
- Whether CMS media and private S.I.M.S. documents use separate storage buckets.

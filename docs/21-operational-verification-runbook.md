# Public Web + CMS Operational Verification Runbook

Status: **ACTIVE**

## Ownership and safety

Codex owns implementation, automated checks, and verification tooling. The Senior Software Engineer owns production backups, privileged database access, secrets, live authenticated browser checks, R2 configuration, deployment, DNS, and operational sign-off.

Never paste database URLs, passwords, API keys, object-storage credentials, cookies, session tokens, or real personal data into source control, screenshots, logs, chat, or the sign-off record. Use synthetic users and content. Redact identifiers that are not needed as evidence.

## Active runtime boundaries

- `apps/web` is anonymous and uses `WEB_DATABASE_URL` through the read-only `public_content` projection package.
- `apps/cms` is authenticated with Better Auth and uses `CMS_DATABASE_URL`.
- `apps/docs` is technical documentation and has no operational-data authority.
- The only authenticated authorization chain is identity → active CMS membership → optional club/organisation scope → active CMS role → explicit permission.

## Environment contract

| Variable | Consumer and authority |
|---|---|
| `PUBLIC_SITE_URL` | Public Web canonical origin |
| `DATABASE_MIGRATION_URL` | Migration/verification role only; never an application runtime |
| `PLATFORM_ADMIN_DATABASE_URL` | Privileged bootstrap only |
| `DATABASE_BOOTSTRAP_ADMIN_URL` | One-time database-role setup only |
| `WEB_DATABASE_URL` | `slgs_web`; read-only `public_content` access |
| `CMS_DATABASE_URL` | `slgs_cms`; CMS and restricted identity operations |
| `BETTER_AUTH_SECRET` | CMS server only; high entropy and environment-specific |
| `CMS_BETTER_AUTH_BASE_URL` | Exact CMS callback origin |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Exact approved CMS browser origins |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | CMS identity recovery sender |
| `CLOUDFLARE_R2_*` | CMS server only; bucket-scoped private-media authority |

## Verification gates

Run `pnpm check` and `git diff --check` before operational verification. The production migration and all privileged checks are intentionally excluded from automated verification.

After approved backup and retention review, execute migration `0013_product-scope-reset.sql` using the migration role. Then run:

```bash
pnpm --filter @slgs/db db:verify:scope-reset
```

Verify CMS administration, editorial separation, public projection isolation, private R2 behavior, deployment, TLS, and DNS using the exact checklist in `26-cms-operational-verification-checklist.md`.

## Evidence

Capture command names and exit codes, migration identifier, sanitized SQL verifier output, role/action browser results, redacted screenshots, R2 anonymous-denial and cleanup results, deployment revision, DNS/TLS results, and named sign-off. Automated checks alone do not establish production readiness.

# Phase 1A Infrastructure — Neon and Resend

Status: Implementation complete; external environment verification pending

## Neon PostgreSQL

Neon is the selected PostgreSQL provider for development/staging verification and the initial production baseline. This does not change ADR-009: Web, CMS, S.I.M.S. and migrations use separately scoped credentials.

Use a Neon pooled endpoint (`-pooler` hostname) for application runtime traffic and a direct endpoint for `DATABASE_MIGRATION_URL`. Never run Drizzle migrations through the pooled endpoint. Production database roles must be granted only their documented schemas/read models; possessing a connection string does not confer application membership.

### Environment setup

1. Authenticate the Neon CLI and link the repository to the approved SLGS Neon project.
2. Use a separate Neon branch for development/staging migration verification.
3. Put the direct branch connection in the local secret store as `DATABASE_MIGRATION_URL`.
4. Put separately granted pooled connections in `WEB_DATABASE_URL`, `CMS_DATABASE_URL`, and `SIMS_DATABASE_URL`.
5. Never copy any connection string into source, documentation or `.env.example`.

### Migration procedure

1. Inspect `packages/db/drizzle/0000_little_scarlet_spider.sql` and confirm the target branch/database.
2. Run `pnpm --filter @slgs/db db:migrate` with the direct migration credential.
3. Query `drizzle.__drizzle_migrations` to verify migration state.
4. Verify the `identity` tables, indexes, foreign/check constraints, application-boundary trigger, administrator-limit function and constraint triggers.
5. Run the database-backed Phase 1A invariant suite with synthetic identities only.

The live migration must not be described as applied until those checks pass against the named Neon branch.

## Resend transactional email

Resend is the selected server-side delivery provider for Better Auth password recovery. Better Auth continues to generate, expire and consume recovery credentials; the Resend adapter only delivers the generated link.

Required server secrets:

- `RESEND_API_KEY` — a sending-only key restricted to the approved sending domain where supported.
- `RESEND_FROM_EMAIL` — mailbox on the exact verified Resend domain.

The adapter sends both text and HTML, uses an idempotency key derived from a one-way hash of the recovery URL, requires HTTPS outside localhost, and maps provider errors to a generic failure. It never logs the URL, token, API key or recipient credential data. Missing or rejected Resend configuration fails recovery closed without disabling ordinary sign-in.

## Resend domain prerequisite

The project owner must choose the exact transactional sending domain. Resend will then display the required SPF and DKIM DNS records and its verification status. Copy those exact values from the Resend dashboard; do not fabricate them. DMARC is strongly recommended, and open/click tracking should be disabled for password-recovery email. The `From` domain must exactly match the verified domain.

Production recovery remains externally unverified until:

1. the sending domain is verified by Resend;
2. secrets are installed in the deployment secret manager;
3. a synthetic controlled identity completes request, delivery, reset, session revocation and new-password sign-in;
4. logs and audit records are checked for secret absence.

## Environment separation

Development, staging and production use separate Neon branches/credentials, Better Auth secrets and Resend API keys. Production secrets must never be copied into local development. Synthetic Resend test recipients such as `delivered@resend.dev` may be used only within Resend's documented sandbox constraints; do not invent addresses at real providers.

The CMS and S.I.M.S. Vite configurations load server environment values from the repository-root `.env` and `.env.local`. Variables already supplied by the shell or deployment platform take precedence. Vite exposes only explicitly prefixed public variables to browser bundles; the database, Better Auth and Resend values remain server-only.

## Initial administrator bootstrap

Platform System Administration is the external two-person authority that performs bootstrap; it is not a global application role or login. Configure a dedicated `PLATFORM_ADMIN_DATABASE_URL`, apply the identity migration, and then use the server-only CLI:

```bash
pnpm admin:bootstrap setup --operator <operator-1-reference>

pnpm admin:bootstrap domain --domain <approved-domain> --operator <operator-1-reference>

pnpm admin:bootstrap initiate \
  --application cms \
  --role cms_administrator \
  --name "<administrator-name>" \
  --email "<administrator-email>" \
  --person-reference "<approved-evidence-reference>" \
  --initiator "<operator-1-reference>"

pnpm admin:bootstrap approve \
  --request "<request-id-from-initiate>" \
  --approver "<operator-2-reference>"

pnpm admin:bootstrap status
```

`setup` is a one-time infrastructure action that uses `DATABASE_MIGRATION_URL` to create or rotate the scoped `slgs_platform_admin` PostgreSQL role. It writes the resulting connection URL into the ignored `.env` file with owner-only permissions and never prints the credential. Subsequent commands use that scoped credential rather than the migration identity.

Repeat `initiate` and `approve` with `--application sims` for the first S.I.M.S. System Administrator. Omitting `--role` selects the existing `cms_administrator` or `sims_system_administrator` default. ADR-025 permits the same controlled mechanism to provision the first CMS System Administrator with `--application cms --role cms_system_administrator`. This does not elevate an existing CMS administrator, cannot grant S.I.M.S. authority, rejects a duplicate pending or completed initial-role request and retains the two-distinct-operator approval requirement.

The CLI securely prompts twice for the initial password, refuses identical initiator/approver references, activates the target only on approval, creates only the matching application membership, and writes audit records. Operator references must identify two real, independently authenticated and separately authorized Platform System Administration people and must not be shared-account names. Normal CMS role assignment remains available only to an authenticated CMS System Administrator.

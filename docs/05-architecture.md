# Architecture

## Logical topology

                    SLGS Monorepo
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
    apps/web         apps/cms         apps/sims
   public read      editorial CMS     private admin
        |                |                |
        +----------------+----------------+
                         |
                  shared packages
                         |
             +-----------+-----------+
             |                       |
         PostgreSQL              Object Storage
          + Drizzle              media/docs

## Application boundaries

### Web
Public, read-only application.

### CMS
Authenticated editorial application.

### S.I.M.S.
Authenticated private application.

## Shared packages

- packages/ui
- packages/db
- packages/auth
- packages/permissions
- packages/validation
- packages/storage
- packages/config

Do not turn shared packages into a dumping ground. Shared code must have a clear ownership boundary.

## Planned stack

Primary:
- React
- TypeScript
- TanStack Start
- Tailwind CSS
- shadcn/ui
- Tabler Icons
- PostgreSQL
- Drizzle ORM
- Better Auth
- Zod
- Day.js

Supporting:
- Vercel for hosting if appropriate
- Sentry for error monitoring
- Resend for transactional email if required
- analytics only where privacy and school policy permit

Optional future:
- Vercel AI SDK
- object storage/CDN
- QR/barcode scanning
- offline PWA support

## Hosting strategy

Start simple. Separate deployment targets for:
- web
- cms
- sims

Use environment-specific secrets and database configuration.

Do not assume that a free tier is suitable for production school data. Validate privacy, retention, backups, availability, and contractual requirements before production.

## Database strategy

Start with PostgreSQL.

Use Drizzle migrations.

Keep domain tables organized and documented.

Avoid database-level coupling between public content and sensitive S.I.M.S. records.

## Media strategy

Store binary files in object storage rather than PostgreSQL.

Cloudflare R2 is the accepted production provider for private CMS media. It is accessed through the provider-neutral CMS storage contract; the bucket remains private and only authenticated, authorized server operations may issue short-lived presigned URLs. Public media delivery remains a separate Phase 1D concern.

The configured R2 bucket, restricted CMS-origin browser preflight, private access, presigned transfer, server verification and archive lifecycle were verified with synthetic media on 2026-08-28. Application credentials remain object-scoped rather than bucket-administrative.

The approved production public origin is `http://slgs.edu.sl`. Public Web canonical, Open Graph, sitemap and robots URLs derive from `PUBLIC_SITE_URL` and were verified against that exact origin. Domain/DNS/hosting control is **PENDING INFRASTRUCTURE HANDOVER** from the previous team; this is operational and does not alter the application architecture or Phase 1D closure. HTTPS hardening is deferred until TLS and hosting control can be independently verified.

## Public content strategy

The public Web reads only security-barrier views in the `public_content` PostgreSQL schema using its read-only runtime role and the typed `@slgs/public-content` boundary. Publication filtering is enforced by the views. Web has no CMS, identity or S.I.M.S. schema access. A bounded server cache stores only already-public DTOs; private R2 media is not part of this projection.

PostgreSQL stores:
- metadata
- ownership
- content relationships
- access/publishing state
- audit information

## Security boundary

Public:
- published public content only

CMS:
- editorial content and media

S.I.M.S:
- sensitive administrative data

The CMS and public site must never become an accidental path into S.I.M.S.

## Identity administration

Shared authentication remains in `@slgs/auth`, but administrative identity lifecycle is S.I.M.S.-owned. `apps/sims` derives actors from Better Auth sessions and invokes transactional lifecycle services; CMS cannot provision global identities. CMS and S.I.M.S. memberships, roles and scopes are independently authorized and reinforced by PostgreSQL RLS.

Students are administrative records rather than authenticating identities in Phase 2A. The security audit is append-only at database level and application-isolated for runtime reads. See `docs/20-phase-2a-sims-identity-administration.md`.

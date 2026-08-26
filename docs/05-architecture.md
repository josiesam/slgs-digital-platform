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

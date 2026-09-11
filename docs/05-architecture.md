# Architecture

Status: **ACTIVE**

```text
SLGS Public Web
    ↓ published-only public_content projections
CMS
    ├── Users and memberships
    ├── Clubs, roles and permissions
    ├── Content and editorial workflow
    ├── Private media
    └── Audit
Infrastructure
    ├── Better Auth
    ├── PostgreSQL
    └── private Cloudflare R2
```

`apps/web` is anonymous and uses only the least-privileged public read boundary. `apps/cms` is the sole authenticated administrative application. Authentication establishes identity; server-side authorization checks active CMS membership, active role assignment, the permission catalogue and assignment-bound scope.

The CMS R2 bucket remains private. Browser uploads and downloads use short-lived server-authorized presigned URLs. PostgreSQL remains authoritative for ownership, lifecycle, scope and audit. Public media delivery is a separate infrastructure decision.

There is no active school-administration application, student authentication boundary, attendance system or academic administration domain.

# SLGS Public Web + CMS — Product Requirements

Status: **ACTIVE**

## Product scope

The accepted product is the anonymous SLGS public website and its authenticated content management system. The former school-administration system is discontinued and is not an active product boundary.

The public Web presents school information, admissions, academics, school life, parent information, news, events, galleries and contact information. It reads only published projections.

The CMS manages users, memberships, clubs, roles, permissions, content, editorial workflow, private media and audit history. Public registration is disabled.

## Required qualities

- TypeScript and React throughout the monorepo.
- PostgreSQL with Drizzle for relational persistence.
- Better Auth for CMS identities and sessions.
- Default-deny, server-side, scope-aware CMS authorization.
- Private Cloudflare R2 storage through a provider-neutral contract and server-controlled presigned operations.
- Immutable revisions and auditable editorial, identity, permission and media lifecycle events.
- Accessible, responsive, content-led public pages and operationally clear CMS interfaces.
- No credentials, authentication secrets, private object keys, checksums or workflow internals in public DTOs.

## Editorial lifecycle

Content follows `draft → submitted → in_review → approved → published`, with rejection/resubmission, unpublish and archive behavior where supported. Authors cannot review or approve their own work. Publication requires explicit authority.

## Excluded scope

Student/staff administrative records, attendance, academic administration, finance, asset administration, and student authentication are not part of this product.

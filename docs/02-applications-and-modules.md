# Applications and Modules

Status: **ACTIVE**

## `apps/web` — Public Website

Anonymous, read-only presentation of published school content. It consumes the `public_content` security-barrier projections and never reads CMS operational tables or identity data.

## `apps/cms` — Content Management System

Authenticated editorial administration containing:

- CMS user provisioning, activation, suspension/deactivation and session revocation;
- CMS membership, club membership/scope, role assignment and permission enforcement;
- data-driven club lifecycle management;
- pages, articles, events, announcements and galleries;
- draft, review, approval, publication and unpublication workflows;
- private media upload/download/archive lifecycle;
- editorial and identity/authorization audit history.

The administration information architecture is organised as Dashboard; Content (Pages, News, Events, Announcements, Gallery and Media Library); Editorial queues; Public Web; Access (Users, Clubs, Roles & Permissions); and System (Audit Log and System Status). `/admin` is a summary command centre; detailed forms remain in their dedicated areas.

## Shared packages

- `@slgs/auth`: CMS authentication, session reading, bootstrap and identity lifecycle.
- `@slgs/db`: CMS/Web schemas and database connections.
- `@slgs/permissions`: closed CMS permission catalogue and default-deny evaluator.
- `@slgs/cms-domain`: editorial and media domain rules.
- `@slgs/public-content`: published-only public DTO boundary.
- UI, configuration and validation packages remain shared where appropriate.

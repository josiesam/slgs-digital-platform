# Data Model

Status: **ACTIVE**

## Identity

Better Auth identity tables support users, accounts, sessions, verification and two-factor state. CMS access is modeled by `application_membership`, `role_definition`, `role_assignment` and `role_assignment_scope`. Approved contact domains and privileged bootstrap remain controlled infrastructure. Security audit events are append-only.

Only the CMS application value is used by active code. Historical migrations retain the earlier enum value so migration history is not rewritten; migration `0013_product-scope-reset.sql` removes discontinued memberships, roles, bootstrap requests, schema objects, policies and runtime access.

## CMS

`cms.club` is data-driven. Content items own immutable revisions and workflow events. Media assets retain private object metadata and lifecycle state; content-media links preserve ordered composition. Editorial audit events are append-only and retention policy starts disabled until school policy is approved.

## Public content

Security-barrier projections expose only published pages, articles, events, announcements and galleries where `state = 'published'` and `published_at IS NOT NULL`. DTOs exclude identities, workflow internals, audit data and private storage metadata.

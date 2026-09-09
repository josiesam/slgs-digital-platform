# Phase 1C — CMS Workflow

Status: **IMPLEMENTATION COMPLETE — OPERATIONAL VERIFICATION PENDING**

The database, domain, authorization and private R2 infrastructure gates pass. The latest functional assessment supersedes earlier closure wording: Phase 1C is not closed until representative role workflows, CMS-to-Web publication/unpublication and the real browser R2 flow pass through the applications.

## Architecture

The CMS remains a private TanStack Start application. Server functions obtain the authoritative Better Auth session and Phase 1B assignment-scoped grant, validate input and call `@slgs/cms-domain`. Domain services own workflow and media rules; Drizzle repositories own PostgreSQL persistence. Role-aware UI improves clarity but is never the authorization boundary.

The public Web and S.I.M.S. applications receive no CMS schema privileges. Phase 1D provides a separate published read model; the public application does not read CMS tables.

## Content model

`cms.content_item` supports pages, articles, events, announcements and galleries. Common fields include title, slug, summary, body, SEO title/description, canonical path, author, owning club, workflow state and publication metadata. Event dates, location and organiser have event-specific validation and database constraints.

Authorship and club ownership are persisted references. Membership changes never rewrite historical author, reviewer, approver or publisher facts. Every edit creates an immutable `content_revision` snapshot. `workflow_event` records transitions and comments.

## Workflow

Allowed state changes are:

`draft → submitted → in_review → approved → published`

`in_review → rejected → submitted`

`published → approved` (unpublish)

Review completion is recorded while content remains `in_review`; approval requires a completed independent review. Application services and a PostgreSQL trigger reject bypasses. Authors cannot review or approve their own work.

## Clubs and scopes

Clubs are rows in `cms.club`, not constants. Stable keys, lifecycle state and creator are auditable. Initial clubs are created by authorized CMS configuration administration; subsequent club lifecycle supervision belongs to explicitly assigned Member / Club Leadership through assignment-bound `club` scopes. Ordinary club membership grants no supervision.

Multimedia and News Journal roles remain distinct. News Journal members may create and submit articles, events and announcements. Multimedia members may create authorized media and multimedia content. Neither role reviews, approves, publishes, reaches another club, or receives S.I.M.S. permissions by implication.

## Roles and permissions

Phase 1C adds Multimedia Club Supervisor, News Journal Club Supervisor and CMS System Administrator contracts. Editor, Reviewer, Approver and Publisher remain separate. CMS System Administrator alone may create/activate/deactivate custom CMS roles and assign them. Custom permissions are parsed through the closed catalogue and rejected if they belong to S.I.M.S. Normal assignment is immediate and audited; only privileged bootstrap retains two-person approval.

The CMS catalogue covers page/article/event/announcement/gallery creation and submission; content read/update/review/reject/approve/publish/unpublish; media create/read/update/archive; club management; membership/configuration/audit; and CMS-only role definition/assignment actions.

## Media

`cms.media_asset` stores opaque storage keys, normalized filenames, declared and detected MIME types, byte size, checksum/dimensions when available, alt text, owner, club, lifecycle status and archive time. `content_media` links media to content with purpose and order.

Image validation permits PNG, JPEG and WebP up to 10 MB, verifies magic bytes against MIME and extension, normalizes display filenames and generates opaque `cms/media/<uuid>.<extension>` keys. Object-storage operations are server-only through `CmsObjectStorage`; Cloudflare R2 implements that provider-neutral contract with its S3-compatible API. The R2 bucket is private and PostgreSQL remains authoritative for ownership, scope, lifecycle, relationships and audit history.

The browser requests an upload through an authenticated CMS server function. The server authorizes `media:create:own`, validates metadata and signature prefix, creates the pending database record with its server-generated key and returns a short-lived presigned PUT URL. After direct upload, finalization performs server-side R2 HEAD and GET operations, verifies exact size, MIME and image signature, computes SHA-256 and only then marks the record `available`. Signing failures become `failed`; verification failures become `rejected`; neither state is trusted or downloadable.

Downloads require a fresh authenticated, assignment-scoped CMS authorization decision before a short-lived presigned GET URL is issued. Archived media cannot receive download URLs. Archive is a PostgreSQL lifecycle transition with an audit event and deliberately retains the private R2 object; physical deletion is a future privileged retention operation, never a browser action.

Server-only configuration variables are `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` and `CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS`. Missing or invalid configuration fails closed. The bucket token must be restricted to the private CMS media bucket. Browser PUT requires an R2 CORS rule allowing only approved CMS origins and required PUT headers; CORS does not replace signing or CMS authorization.

PostgreSQL and R2 do not share a transaction. Pending records whose upload never completes are the reconciliation ledger. Operators must inspect stale `pending`, `failed` and `rejected` rows against R2 HEAD results, retry finalization where safe, and retain or remove objects only under an approved audited retention procedure. An R2 outage or expired URL does not mark an asset available.

**DECISION REQUIRED — OPERATIONAL DETAIL:** exact bucket name; Cloudflare account and environment separation; presigned URL lifetime; production image decoding/malware scanning service; lifecycle/retention rules; backup/recovery strategy; monitoring and alerting; and whether a future public custom media domain is required. Phase 1D owns public delivery and the current private bucket must not be made public.

## Audit and retention

`cms.editorial_audit_event` records actor/session references, event type, resource, outcome, stable reason and sanitized metadata. It covers content, workflow, media, club and routine authorization-denial events. A database trigger makes rows append-only. Passwords, tokens, session secrets, MFA material, recovery URLs and API keys are forbidden.

`cms.retention_policy` centralizes retention configuration. Retention starts disabled with no invented duration. Evidence preservation uses `preserve_until` so an approved purge process can exclude held records.

**DECISION REQUIRED — OPERATIONAL DETAIL:** exact retention days, export approval and purge schedule.

## Incident response

Security/Platform System Administration owns intake and investigation coordination, may use approved identity lifecycle controls to suspend identities, revoke sessions and disable access, and preserves audit evidence. Business-role owners assist with content context but do not alter evidence.

**DECISION REQUIRED — OPERATIONAL DETAIL:** named on-call contact, escalation timetable, notification channels and evidence-export procedure.

## Database and public boundary

Migrations `0005_phase-1c-cms-workflow.sql`, `0006_phase-1c-multimedia-gallery.sql` and `0007_phase-1c-r2-storage.sql` create and finalize `cms.club`, `content_item`, `content_revision`, `workflow_event`, `media_asset`, `content_media`, `editorial_audit_event` and `retention_policy`; enums, foreign keys, uniqueness/check constraints and indexes; workflow/audit triggers; CMS runtime grants; non-CMS revocations; and Phase 1C role seeds.

Phase 1C exposes no public route. The Phase 1D contract projects only `published` records with a publication timestamp into an explicit public read boundary. Draft, submitted, in-review, rejected and approved-only records remain private.

## Application remediation verification

The CMS application now loads authoritative draft values before editing and saves immutable revisions without silently clearing untouched content. It exposes event-specific fields, ordered gallery/content media composition, role-aware review/rejection/approval/publish controls, scoped operational queues, revision and workflow history, authorized audit visibility, safe identity labels, club lifecycle controls and confirmation for destructive operations. Application tests cover draft population, event fields, workflow action separation, self-action suppression, scoped dashboard visibility, gallery composition visibility and the generic sign-in failure state.

These deterministic tests do not replace the outstanding operational browser gate. A Senior Software Engineer executes it with an isolated Neon branch, temporary synthetic identities and locally managed secrets according to `docs/21-operational-verification-runbook.md`. Missing Codex access to those secrets is not an implementation defect.

ADR-025 resolves first CMS System Administrator provisioning by allowing the existing two-person Platform System Administration bootstrap to explicitly select `cms_system_administrator`. Existing CMS administrators are not elevated; the path remains one-time, audited, CMS-only and separate from normal CMS role assignment.

## Existing infrastructure verification

The domain suite exercises creation, revision ownership, ordered transitions, rejection/resubmission, self-review, cross-club isolation, approval/publication guards, image signature validation, media ownership/archive and denial auditing. `verification/phase-1c.sql` verifies live schema/roles, CMS/S.I.M.S. permission isolation, transition bypass rejection, self-review/approval rejection, audit immutability and runtime grants inside a rolled-back transaction.

On 2026-08-28, the configured private Cloudflare R2 infrastructure passed a live synthetic integration test. The test authenticated the application token to the configured bucket, verified an effective presigned-URL CORS preflight for the configured CMS origin with no wildcard origin, uploaded a synthetic PNG signature through presigned PUT, confirmed anonymous direct access was denied, finalized through server HEAD/GET validation, verified size, MIME, signature and SHA-256, observed `available` state and audit events, downloaded through an authorized presigned GET and archived the record. Missing and malformed objects were rejected. Database fixtures ran inside a rolled-back transaction and all synthetic R2 objects were physically removed after verification.

The application credential intentionally does not have bucket-administration permission to read the CORS policy document. Effective CORS was verified through the same browser preflight used by the upload flow; application credentials were not broadened.

## Remaining operational decisions

Cloudflare R2 is the verified production CMS object-store provider. Remaining retention, recovery, monitoring, incident-response and future public-media delivery decisions are operational governance items. Phase 1C nevertheless remains conditional until the browser functional gate above passes. S.I.M.S. scope policy remains outside this phase.

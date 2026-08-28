# Phase 1D — Public Web Integration

Status: Closed

Phase 1C is **PHASE 1C — CLOSED** following successful production R2 connectivity, CORS, upload, verification, download, archive, failure-path and cleanup tests.

## Public architecture

`apps/web` is an anonymous TanStack Start application and remains independently deployable from CMS and S.I.M.S. It imports `@slgs/public-content`, not `@slgs/cms-domain`, `@slgs/auth`, or S.I.M.S. code. Shared presentation tokens remain in `@slgs/ui`; Web-specific composition remains in `apps/web`.

Primary navigation is Home, About, Admissions, Academics, Life, Parents, News, Events, Gallery and Contact. Announcements are an editorial route linked from published homepage notices but are intentionally not an additional primary navigation item.

## Read boundary and DTOs

Migration `0008_phase-1d-public-read-boundary.sql` creates security-barrier views in the `public_content` schema for `page`, `article`, `event`, `announcement` and `gallery`. Each view projects only records with `state = published` and a non-null publication time. Filtering occurs inside PostgreSQL, not in the browser.

The `slgs_web` runtime role receives `USAGE` on `public_content` and `SELECT` on its views. It retains no CMS, identity or S.I.M.S. schema access and no public-content mutation privilege. CMS and S.I.M.S. runtime roles receive no implicit access to the public schema.

`PublicContentItem` exposes only ID, kind, slug, public text/SEO fields, publication/update timestamps, public event details and a public-media array. It excludes workflow state, internal actors, ownership, authorization, audit, revisions, private media metadata and object keys. CMS-authored body text is rendered as text paragraphs rather than injected HTML.

## Publication, caching and invalidation

Publication is detected by the read views immediately. The Web server applies an in-process 60-second cache only after records have crossed the database publication boundary. This keeps the first production baseline infrastructure-neutral and bounds normal publication propagation to approximately one minute per Web process. Deployments and process restarts naturally clear the cache.

No webhook or event bus is introduced. A future hosting decision may replace this with provider-native tagged revalidation, but it must preserve the database publication filter. `DECISION REQUIRED — OPERATIONAL DETAIL`: production cache provider and whether editors require explicit immediate purge rather than bounded revalidation.

## Public media

The private Phase 1C R2 bucket remains private. Phase 1D does not project storage keys, generate anonymous private-bucket signatures or create a public bucket. Published galleries appear with a clear media-unavailable state; `PublicMedia` is the future URL-safe DTO boundary.

`DECISION REQUIRED — PUBLIC MEDIA DELIVERY`: approve the public media domain/CDN, promotion or delivery mechanism from private R2, cache rules, invalidation and image transformation. Until resolved, production gallery images and featured images are conditionally unavailable without weakening privacy.

## Routes and SEO

Routes are `/`, `/about`, `/admissions`, `/academics`, `/life`, `/parents`, `/contact`, `/news`, `/news/:slug`, `/events`, `/events/:slug`, `/announcements`, `/announcements/:slug`, `/gallery`, `/gallery/:slug`, `/sitemap.xml` and `/robots.txt`.

The root and route heads provide titles, descriptions, absolute canonical references and route-specific Open Graph URLs. Dynamic editorial metadata comes only from the public DTO. Sitemap content combines the stable public information architecture with published editorial slugs; robots allows public crawling and points to the sitemap while excluding internal server-function paths. `PUBLIC_SITE_URL` supplies the approved production origin.

## Accessibility and resilience

The public shell uses semantic header/nav/main/footer landmarks, a skip link, native links and disclosure navigation, visible focus, logical headings, adequate target sizes, responsive layouts and reduced-motion handling. Text contrast is designed against the shared semantic palette. Media DTOs require alt text when the public delivery boundary is activated.

Missing CMS pages, empty listings and empty galleries render explicit non-fabricated states. The router supplies loading, not-found and generic error UI without exposing stack traces or database errors.

## Verification

Unit coverage checks DTO privacy, bounded caching, public route families and SEO projection. The live `phase-1d.sql` verification inserts synthetic content across every CMS state for every public type, proves each view exposes only its published row, checks projection columns and verifies the Web database role is read-only and isolated from CMS, identity and S.I.M.S.

Rendered verification confirmed desktop and mobile navigation, a native keyboard-operable mobile disclosure, skip-link target, semantic landmarks, one homepage H1, logical headings, empty/error/404 states and reduced-motion styling. Valid routes returned 200, an unpublished/missing article returned 404, and sitemap/robots returned the correct content types. Lighthouse was not available; no Lighthouse result is claimed.

The approved production public origin is `http://slgs.edu.sl`. `PUBLIC_SITE_URL` is configured and application-generated canonical, Open Graph, sitemap and robots URLs were verified against that exact origin without requiring public DNS resolution. HTTPS was not inferred or substituted.

Application configuration: **VERIFIED**.

Domain/DNS/hosting control: **PENDING INFRASTRUCTURE HANDOVER** from the previous team. This is an operational dependency, not an unmet Phase 1D application criterion. TLS, HTTP-to-HTTPS redirects, secure production-cookie behavior and HSTS require separate verification after handover.

## Decisions required

**DECISION REQUIRED — SCHOOL POLICY**

- Official school overview, mission, vision, values, history and leadership content.
- Official admissions requirements, dates, fees, documents and FAQs.
- Official address, telephone, email, opening information and social links.
- Whether author display names are intentionally public; Phase 1D currently omits them.

**DECISION REQUIRED — OPERATIONAL DETAIL**

- Public media domain/CDN and private-to-public delivery mechanism.
- Hosting region/provider, infrastructure handover and cache/revalidation service.
- Performance budgets, browser support, monitoring and availability targets.

No Phase 2 functionality is included.

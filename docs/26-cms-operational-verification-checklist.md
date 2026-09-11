# CMS Administration Operational Verification Checklist

Status: **ACTIVE — PRIVILEGED EXECUTION PENDING**

This checklist prepares, but does not claim, production verification. The Senior Software Engineer executes privileged steps with synthetic data and records sanitized evidence.

## 1. Back up before migration

- [ ] Record the target environment, database identifier, current deployed revision, current migration journal, and operator.
- [ ] Take and validate a restorable database backup covering the `identity`, `cms`, and `public_content` schemas, roles/grants, and migration journal.
- [ ] Export or otherwise preserve discontinued records required by the approved retention policy before deletion.
- [ ] Record R2 bucket configuration, CORS, lifecycle rules, and access-policy metadata; do not export secrets into the evidence pack.
- [ ] Confirm the rollback/restore owner, procedure, and recovery window.

## 2. Execute the approved migration

- [ ] Review `packages/db/drizzle/0013_product-scope-reset.sql` and obtain explicit Senior Software Engineer sign-off.
- [ ] Use `DATABASE_MIGRATION_URL`, never `CMS_DATABASE_URL` or `WEB_DATABASE_URL`.
- [ ] Execute migration `0013_product-scope-reset.sql` once through the approved migration workflow.
- [ ] Do not edit earlier migrations or manually imitate only part of migration `0013`.
- [ ] Capture sanitized start/end timestamps, migration identifier, exit status, and operator.

## 3. Post-migration SQL verification

- [ ] Run `pnpm --filter @slgs/db db:verify:scope-reset` with the migration verification role.
- [ ] Confirm the discontinued schema/runtime role and all discontinued memberships, roles, assignments, and bootstrap requests are absent.
- [ ] Confirm the CMS system-administrator permission set includes CMS user lifecycle, role, and session operations.
- [ ] Confirm `slgs_web` has `USAGE`/`SELECT` only for `public_content` and cannot use `identity` or `cms`.
- [ ] Confirm `slgs_cms` cannot create non-CMS memberships or roles and RLS returns only CMS authorization rows.
- [ ] Confirm historical security/editorial audit rows required by retention policy remain readable to authorized auditors.

## 4. Browser verification

- [ ] Anonymous Web navigation succeeds without a CMS session; unpublished content and every private CMS endpoint remain unavailable.
- [ ] At `/admin/users`, verify search/list, approved-domain rejection, pending provisioning, explicit activation, suspension, deactivation, session revocation, role assignment/revocation, club scope, organisation scope, effective permissions, and lifecycle history.
- [ ] Confirm self-suspension and self-deactivation fail through direct server requests, not merely hidden controls.
- [ ] Confirm a revoked session fails on the target user's next protected request.
- [ ] Confirm users lacking each required permission receive denial and that a sanitized `authorization.denied` audit event is recorded.
- [ ] Confirm responses and browser/network inspection never expose password hashes, temporary passwords after submission, session tokens, cookies, recovery tokens, credentials, or secrets.
- [ ] Exercise draft → submit → independent review → independent approval → publish and verify self-review, self-approval, cross-club access, premature publish, and unauthorized unpublish are denied.
- [ ] Verify published content appears on Web and disappears after unpublish within the documented cache bound.
- [ ] Verify keyboard operation, focus visibility, labels, status/error announcements, and layouts at approximately 375px and 1280px.

## 5. R2 verification

- [ ] Confirm the bucket is private and anonymous object GET/list requests fail.
- [ ] Confirm the CMS token is bucket-scoped and permits only required object operations.
- [ ] Confirm CORS allows only the exact CMS origin, required headers, and PUT; no wildcard origin.
- [ ] With `SLGS_R2_INTEGRATION=1`, run the opt-in synthetic R2 integration test using local secrets.
- [ ] In the CMS, verify authorized presigned PUT, finalize/HEAD/signature/hash validation, authorized short-lived GET, and archive denial.
- [ ] Confirm presigned URLs expire within configured bounds and no R2 credential appears in browser assets or responses.
- [ ] Delete synthetic objects and capture a sanitized zero-remaining result.

## 6. DNS and deployment

- [ ] Record Web, CMS, and Docs deployment revisions and environment-variable ownership.
- [ ] Confirm Web deployment has no CMS database, Better Auth secret, email, or R2 credentials.
- [ ] Confirm CMS is served only from its approved origin with secure cookies, HTTPS, and exact trusted origins.
- [ ] Confirm public DNS ownership, A/AAAA/CNAME records, certificate chain, renewal, HTTP-to-HTTPS redirect, and canonical `PUBLIC_SITE_URL`.
- [ ] Confirm health checks, logs without sensitive data, alerting, backup schedule, restore drill ownership, and secret rotation plan.

## 7. Sign-off evidence

- [ ] Backup identifier and restore-validation result.
- [ ] Migration `0013` execution record and post-migration SQL pass output.
- [ ] Browser role/action matrix with synthetic identities and redacted screenshots.
- [ ] Sanitized audit-event samples for success and denial.
- [ ] R2 privacy, CORS, presigned lifecycle, expiry, and cleanup results.
- [ ] Deployment revisions plus DNS/TLS evidence.
- [ ] Outstanding exceptions with owner/date, and final Senior Software Engineer name/date/decision.

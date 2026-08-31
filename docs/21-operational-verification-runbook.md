# Operational Verification Ownership and Runbook

## Security operating principle

SLGS applies least privilege to humans and development agents. Codex owns implementation, automated verification tooling and engineering documentation. The Senior Software Engineer / Project Owner owns secrets, privileged infrastructure, authenticated live-browser execution, production configuration, cleanup and operational sign-off.

Credentials must remain in the engineer's local environment, authenticated CLI, operating-system keyring or approved secret manager. Never paste passwords, API keys, tokens, database URLs, cookies or private keys into chat, source, fixtures, screenshots or verification reports. Codex accepts sanitized command output, screenshots, pass/fail summaries and redacted logs as evidence.

## Status model

- **CLOSED:** implementation and required verification are complete and evidence is recorded.
- **CONDITIONALLY CLOSED:** implementation and automated verification pass, with a specifically identified operational verification item outstanding.
- **IMPLEMENTATION COMPLETE — OPERATIONAL VERIFICATION PENDING:** privileged verification is the only remaining gate; this is not an architecture blocker.
- **BLOCKED:** an actual implementation, architecture, security, dependency or unresolved-policy defect prevents safe progress.

Implementation, engineering verification, operational verification and production readiness are reported independently.

## Verification ownership matrix

| Requirement | Classification | Owner | Codex action | Engineer action | Status |
|---|---|---|---|---|---|
| CMS workflow/domain implementation | CODE IMPLEMENTATION | Codex | Maintain services, UI and migrations | None | Complete |
| CMS role/workflow automated suites | AUTOMATED TEST | Codex | Maintain and run deterministic tests | Review evidence | Complete |
| CMS multi-role browser matrix | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide fixtures and matrix | Execute with synthetic sessions | Pending |
| R2 adapter and validation | CODE IMPLEMENTATION | Codex | Maintain provider boundary/tests | None | Complete |
| R2 credentials, bucket and CORS | PRODUCTION CONFIGURATION | Senior Engineer | Maintain environment contract | Configure with least privilege | Pending sign-off |
| Browser R2 upload/finalize/download/archive | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide procedure/integration test | Execute and sanitize evidence | Pending |
| Public-content views and DTO boundary | CODE IMPLEMENTATION | Codex | Maintain migration/package/tests | None | Complete |
| Public origin application generation | NON-PRIVILEGED LOCAL VERIFICATION | Codex | Verify generated URLs without DNS | Review evidence | Complete |
| CMS publish/unpublish propagation to Web | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide workflow and assertions | Execute authenticated browser gate | Pending |
| DNS, hosting and TLS hardening | PRODUCTION CONFIGURATION | Senior Engineer | Document expected origin/security checks | Configure and approve | Pending handover |
| S.I.M.S. identity/role implementation | CODE IMPLEMENTATION | Codex | Maintain services, UI and migrations | None | Complete |
| S.I.M.S. domain/auth tests | AUTOMATED TEST | Codex | Maintain and run tests | Review evidence | Complete |
| Phase 2A runtime-role scripts | AUTOMATED TEST | Codex | Maintain fail-fast SQL scripts | Execute with local secret environment | Complete tooling; execution pending |
| Disposable `phase2a-*` Neon branch | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Maintain fixture safeguards/runbook | Authenticate, create, verify and delete branch | Pending |
| Phase 2A authenticated browser matrix | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide UI, fixtures and matrix | Execute and provide sanitized results | Pending |
| Phase 2B core implementation/tests | CODE IMPLEMENTATION / AUTOMATED TEST | Codex | Maintain schema, services, UI and tests | Review evidence | Complete |
| Phase 2B runtime-role verifier | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Maintain fail-closed synthetic verifier | Execute on disposable branch | Pending |
| Phase 2B authenticated browser matrix | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide routes and assertions | Execute with synthetic personas and clean up | Pending |
| Phase 2C architecture/design gate | ARCHITECTURE / DOCUMENTATION | Codex | Maintain approved boundary and decisions | Project Owner approves policy decisions | Conditionally approved |
| Phase 2C disposable database/browser verification | PRIVILEGED OPERATIONAL VERIFICATION | Senior Engineer | Provide fail-closed tooling and matrix after implementation | Execute with synthetic data and clean up | Not applicable until implementation |
| Audit retention and operational scopes | PROJECT-OWNER DECISION | Project Owner | Preserve extension points/default deny | Approve policy | Pending |
| Production secrets and monitoring | PRODUCTION CONFIGURATION | Senior Engineer | Validate schemas/fail closed | Configure, rotate and sign off | Pending |

## A. Environment preparation

Copy `.env.example` to a git-ignored local environment file or inject values from a secret manager. Do not commit it and do not include it in evidence.

| Variable | Sensitivity | Consumer / required authority |
|---|---|---|
| `PUBLIC_SITE_URL` | Safe configuration | Web; approved value is `http://slgs.edu.sl` until TLS is verified |
| `DATABASE_MIGRATION_URL` | Secret | Drizzle/verification; migration-only role, never application runtime |
| `PLATFORM_ADMIN_DATABASE_URL` | Secret | Two-person privileged bootstrap only |
| `DATABASE_BOOTSTRAP_ADMIN_URL` | Secret | One-time database-role setup only |
| `WEB_DATABASE_URL` | Secret | Web runtime; `slgs_web`, read-only public views |
| `CMS_DATABASE_URL` | Secret | CMS runtime; `slgs_cms`, CMS plus restricted auth access |
| `SIMS_DATABASE_URL` | Secret | S.I.M.S. runtime; `slgs_sims` |
| `BETTER_AUTH_SECRET` | Secret | CMS/S.I.M.S.; minimum 32 characters and environment-specific |
| `CMS_BETTER_AUTH_BASE_URL` | Safe configuration | CMS callback origin |
| `SIMS_BETTER_AUTH_BASE_URL` | Safe configuration | S.I.M.S. callback origin |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Safe security configuration | Exact approved private-app origins |
| `RESEND_API_KEY` | Secret | Identity recovery sender only |
| `RESEND_FROM_EMAIL` | Safe configuration | Verified sender address |
| `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Secret | CMS server; token restricted to the private media bucket/object operations |
| `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_PRESIGNED_URL_TTL_SECONDS` | Sensitive configuration | CMS server; TTL 60–3600 seconds |
| `NEON_API_KEY`, `SLGS_NEON_PROJECT_ID`, `SLGS_NEON_BRANCH_ID` | Secret/sensitive identifiers | Phase 2A fixture branch verification and deletion |
| `SLGS_SYNTHETIC_PASSWORD` | Secret | Disposable synthetic identities only |

Cloudflare authority must permit object PUT/GET/HEAD/delete only where the test/cleanup requires it; it must not be an account-wide administrator token. Neon authority must permit branch create/read/delete and connection retrieval for the selected project. Browser credentials remain under engineer control.

## B. Neon verification

1. Authenticate locally without sharing output containing credentials:

   ```bash
   npx neon@latest auth --profile DEFAULT
   ```

2. Create an unprotected expiring child branch whose name begins `phase2a-`. Always include `--no-secrets`:

   ```bash
   npx neon@latest branch create --project-id "$SLGS_NEON_PROJECT_ID" --parent "$APPROVED_PARENT_BRANCH_ID" --name "phase2a-<date>-verification" --expires-at "<ISO-8601-expiry>" --no-protected --no-secrets -o json
   ```

3. Independently inspect branch metadata. Stop if it is default, protected, non-expiring or does not match `phase2a-*`. Populate the local secret environment with branch-specific migration/platform/Web/CMS/S.I.M.S. URLs. Never echo them.

4. Apply and verify migrations:

   ```bash
   pnpm --filter @slgs/db db:migrate
   pnpm --filter @slgs/db db:verify:phase1a
   pnpm --filter @slgs/db db:verify:phase1c
   pnpm --filter @slgs/db db:verify:phase1d
   pnpm --filter @slgs/db db:verify:phase2a
   export SLGS_VERIFICATION_DISPOSABLE=true
   export SLGS_VERIFICATION_ENVIRONMENT_ID="neon-branch:<sanitized-branch-id>"
   pnpm --filter @slgs/db db:verify:phase2b
   ```

   The Phase 2A command connects separately as `slgs_sims`, `slgs_cms` and `slgs_web`. Do not substitute the migration URL.

5. Create fixtures only after the harness independently verifies the branch through the Neon API:

   ```bash
   export SLGS_PHASE2A_BROWSER_FIXTURES=1
   pnpm --filter @slgs/auth fixtures:phase2a-browser create
   ```

   Keep the synthetic password in the local secret environment. The harness must not print it.

6. Run the browser matrices below and retain sanitized evidence.

7. Delete the branch using the authenticated Neon CLI or fixture cleanup command. Confirm a subsequent metadata lookup reports it absent:

   ```bash
   pnpm --filter @slgs/auth fixtures:phase2a-browser cleanup
   ```

The harness fails closed against default/protected/non-expiring/wrong-name branches. Branch deletion is primary cleanup; TTL is fallback, not evidence of completed cleanup.

## C. Cloudflare R2 verification

The bucket must be private. The token must be restricted to the intended environment/bucket. CORS must allow only the exact CMS browser origin, PUT and required content headers; never use a wildcard origin.

Run the opt-in R2 integration test with local secrets, then verify through the CMS browser:

1. request an authorized presigned PUT;
2. upload a synthetic permitted image;
3. finalize and confirm HEAD/GET validation, MIME/signature agreement and SHA-256;
4. request an authorized presigned GET and download;
5. confirm anonymous object access fails;
6. archive the media and confirm new authorized download is denied;
7. delete every tracked synthetic object with the privileged cleanup credential;
8. list/check the tracked keys and record that none remain.

Do not broaden application credentials merely to read bucket administration configuration. Effective browser preflight is acceptable CORS evidence.

## D. Browser verification

Use only disposable synthetic identities. Record pass/fail, sanitized screenshots and stable error messages; do not capture passwords, cookies or tokens.

### CMS role matrix

Test CMS System Administrator, CMS Administrator, Multimedia Club Member/Supervisor, News Journal Club Member/Supervisor, Editor, Reviewer, Approver and Publisher. For each applicable role verify login, logout, dashboard/navigation and allowed/denied actions.

Exercise page, article, event, announcement and gallery creation; draft edit and revision; submit; independent review; rejection/resubmission; approval; publish/unpublish; media upload/finalization/download/archive; gallery composition; club scope; role management; and authorized audit visibility.

Negative cases: self-review, self-approval, approval before review, cross-club access, unauthorized server calls, archived-media download, unpublished content on Web and Web access to private CMS data must all be denied.

### Phase 1D propagation

Publish one synthetic item in CMS, wait no longer than the documented cache bound, and confirm it appears through Web. Unpublish it and confirm removal after the same bound. Verify canonical/Open Graph/sitemap URLs still use `http://slgs.edu.sl` in production configuration. Public-media delivery remains a separate project-owner decision.

### Phase 2A matrix

- System Administrator: identity list/detail, provision, activate, suspend/reactivate/deactivate, session revocation, membership lifecycle, custom role create/activate/deactivate, audit, validation and confirmations. Role assignment must remain denied because that belongs to Access Administrator.
- Access Administrator: permitted identity/access view, approved role assignment/revocation and scope requirement; identity lifecycle and role-definition mutations denied.
- Operational Staff: login and assigned grant visibility; all identity/role administration routes and server functions denied. Record-scope read/write awaits Phase 2B resources and is not fabricated in Phase 2A.
- Active no-membership identity: authentication response remains generic and S.I.M.S. protected data is denied.

For lifecycle/session tests, use separate browser sessions: confirm access, apply suspension/deactivation/membership deactivation/role revocation from the authorized administrator session, and confirm the target's next protected server request fails. Also test inactive identity, inactive membership, revoked/inactive role, missing/invalid scope, CMS-to-S.I.M.S. and S.I.M.S.-to-CMS isolation, forged actor fields and direct server-function calls.

At desktop (~1280 px) and mobile (~375 px), verify headings, labels, keyboard order, visible focus, feedback/error announcements, confirmation dialogs, no hover-only critical action and no horizontal overflow.

### Phase 2B matrix

- System and School Administrators: list/detail/create/edit/archive or close each of students, staff, classes, subjects and academic sessions; confirm search, status filter, sorting and pagination.
- Access Administrator: core navigation absent and direct core loaders/mutations denied.
- Operational Staff: assigned student list/detail/update succeeds only for its class; cross-class read/update and every unapproved staff/class/subject/session mutation are denied.
- CMS-only, no-membership, inactive-membership and revoked-role identities: every core loader and mutation denied with no confidential response.
- Confirm student creation creates no Better Auth identity/account and staff identity linkage accepts only an existing explicit identity.
- Confirm lifecycle confirmation, validation feedback, empty states, keyboard order/visible focus and no horizontal overflow at approximately 375 and 1280 pixels.

Run the Phase 2B database verifier only when both disposable-environment variables are set. It inserts deterministic synthetic shapes inside a transaction and rolls back. Record the three runtime-role pass summaries, authenticated browser matrix and disposable branch deletion; do not record URLs, credentials, cookies or real school data.

### Phase 2C future matrix

Phase 2C is not implemented. After policy approval and implementation, the Senior Software Engineer will verify the approved School/System/Operational role matrix, occurrence creation/view/correction, same-scope success, cross-class/session denial, Access Administrator/CMS/Web denial, historical context, immutable corrections, audit events, responsive keyboard operation and disposable-environment cleanup. No Phase 2C operational claim may be made before then.

## Evidence and sign-off

Provide Codex only sanitized evidence:

- command names and exit status;
- aggregate test counts;
- redacted migration/database verifier output;
- screenshots without credentials or personal data;
- browser matrix pass/fail table;
- R2 synthetic-key cleanup count (not keys if sensitive);
- Neon branch-deletion confirmation without connection strings.

Codex records evidence in the relevant phase document and remediates failures from sanitized logs. Production readiness requires separate Project Owner approval of hosting, TLS, monitoring, backup/recovery, retention, incident response and secret lifecycle.

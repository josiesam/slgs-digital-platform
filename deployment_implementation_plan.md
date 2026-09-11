# Deployment Implementation Plan

Status: **ACTIVE — Public Web + CMS**

Deploy two independent application projects:

- `apps/web` at the approved public school domain, using the least-privileged Web database URL.
- `apps/cms` at the approved CMS domain, using CMS-only Better Auth, PostgreSQL and private R2 credentials.

Keep session cookies host-scoped to the CMS domain. Do not expose database, Better Auth, email or R2 secrets to browser bundles. Apply migrations with the dedicated migration principal, then verify the `slgs_web` and `slgs_cms` grants independently.

Before applying `0013_product-scope-reset.sql` outside a disposable environment, the Senior Software Engineer must approve retention/export requirements and a tested backup. The migration removes discontinued database objects and the obsolete runtime role; it does not perform infrastructure, DNS, credential or R2 deletion.

Production verification must cover anonymous published-only reads, unpublish behavior, CMS login and user lifecycle, scoped roles/clubs, editorial separation, private media upload/download, audit immutability, secret absence, monitoring and recovery.

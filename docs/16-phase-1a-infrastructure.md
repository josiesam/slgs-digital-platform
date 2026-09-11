# Phase 1A Infrastructure — CMS Identity

Status: **ACTIVE — updated for CMS-only scope**

PostgreSQL identity infrastructure and Better Auth are retained solely for CMS users. The public Web has no authenticated identity boundary. The CMS and Web use separate least-privileged database credentials.

Approved contact domains, two-person CMS administrator bootstrap, secure sessions, password recovery through the configured transactional-email provider, and sanitized append-only audit records remain active. Development, staging and production use separate database branches and secrets. No credentials are stored in source or fixtures.

The CMS Vite configuration reads server variables from the repository environment. Only explicitly public-prefixed variables may enter browser bundles. Database, Better Auth, email and R2 credentials remain server-only.

The initial bootstrap command accepts only `--application cms` and the `cms_administrator` or `cms_system_administrator` role. Runtime identity provisioning after bootstrap belongs to an authorized CMS System Administrator.

# CMS Identity and Access Policy

Status: **ACTIVE — supersedes the former dual-application identity policy**

Better Auth authenticates CMS users only. There is no public registration, student identity system, staff administrative identity system or second application membership.

Access requires an active identity, active CMS membership, active role assignment, known permission and matching assignment scope. Authentication alone grants nothing. Authorization is enforced by server functions and domain services; browser state is never authoritative.

CMS Administrators may provision approved CMS users, activate/suspend/deactivate them, revoke sessions, manage CMS memberships, and assign/revoke approved CMS roles through explicit server-side permissions. Provisioning requires an approved contact domain and a temporary password of at least twelve characters. Passwords, hashes, tokens, secrets and private credentials are never returned or logged. Administrators cannot suspend or deactivate their own identity through the CMS lifecycle service.

Club membership is an assignment-bound `club` scope and grants only the role's explicit permissions. It never implies review, approval or publication. Reviewer and approver independence and cross-club denial remain mandatory.

Privileged first-administrator bootstrap remains a two-distinct-operator, CMS-only process. Suspension/deactivation revokes sessions. Identity and authorization lifecycle mutations create sanitized audit events.

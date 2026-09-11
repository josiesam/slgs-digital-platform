# CMS Authorization Model

Status: **ACTIVE — updated for CMS-only scope**

`@slgs/permissions` evaluates `identity → active CMS membership → active role assignment → known permission → assignment scope → trusted resource context → explicit business denial`.

The closed catalogue contains only CMS editorial, media, club, user, membership, role, session and audit permissions. Scope dimensions are `club` and `organisation`. Missing, malformed, unknown, inactive and scope-mismatched capabilities are denied.

Roles are CMS-only. Club contributor/supervisor roles carry explicit club scope. Editor, Reviewer, Approver and Publisher responsibilities remain separate. CMS Administrator is granted the complete explicit CMS permission set, including user lifecycle, role definition/assignment, editorial workflow, media, configuration and audit. This is a permission grant, not a hard-coded role bypass; author/reviewer independence remains enforced.

Authors cannot review or approve their own work. Role assignments validate the active target identity and membership, active role, allowed scope dimensions and actor permission. Revocation is historical and audited. Database RLS restricts identity authorization rows to CMS plus the scoped platform bootstrap principal.

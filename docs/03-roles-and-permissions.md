# CMS Roles and Permissions

Status: **ACTIVE**

Authorization is server-side, default deny and expressed as `domain:action[:scope]`. A role grants permissions explicitly; a membership or club association alone grants nothing.

## Access chain

`Identity → active CMS membership → active role assignment → assignment scope → permission`

Club-scoped assignments carry a `club` binding. Editorial-wide assignments use the approved `organisation` binding. Scope provenance stays attached to the assignment that grants the permission.

## System roles

- Multimedia Club and News Journal Club: scoped contribution only.
- Club Supervisor: assigned-club supervision without approval or publication authority.
- Editor: content editing/submission.
- Reviewer: independent review/rejection.
- Approver: independent approval/rejection.
- Publisher: publication/unpublication.
- CMS Administrator: the complete CMS administration role. Its explicit permission grant covers content and media, editorial review/approval/publication, users and memberships, clubs, roles and permissions, configuration and audit visibility.
- CMS System Administrator: retained for compatibility with previously approved identity bootstrap and system-administration assignments; it does not create a role-name bypass.

CMS Administrator permissions include CMS-only user read/create/update/deactivate, session revocation, membership management, club configuration, role definition/assignment/revocation, audit read and CMS-wide editorial/media actions. Every action is still evaluated against the closed permission catalogue on the server. The Administrator role does not bypass author/reviewer independence.

Authors cannot review or approve their own content. Cross-club access, inactive memberships, inactive roles, missing scopes and unknown permissions are denied.

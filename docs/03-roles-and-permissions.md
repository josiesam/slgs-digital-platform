# Roles and Permissions

Use explicit permissions rather than relying only on role names.

## CMS roles

### Multimedia Club
Allowed:
- media:create:own
- media:update:own
- media:archive:own
- gallery:create:own
- gallery:update:own
- gallery:submit:own

Not allowed:
- publish
- approve
- access S.I.M.S.
- access student records

### News Journal Club
Allowed:
- article:create:own
- article:update:own
- article:submit:own
- event:create:own
- event:update:own
- event:submit:own
- announcement:create:own
- announcement:update:own
- announcement:submit:own

Not allowed:
- publish
- approve
- access S.I.M.S.

### CMS Editor
Allowed:
- page:create:own
- page:update:own
- page:submit:own
- content:read:assigned
- content:update:assigned
- content:submit:assigned

### CMS Reviewer
Allowed:
- content:read:assigned
- content:review:assigned
- content:reject:assigned

### CMS Approver
Allowed:
- content:read:assigned
- content:approve:assigned
- content:reject:assigned

### CMS Publisher
Allowed:
- content:read:approved
- content:publish:approved
- content:unpublish:published

### CMS Administrator
Manages CMS membership, configuration and audit access. This role does not implicitly receive editorial or custom-role authority.

### Club Supervisor / Leadership
Explicitly assigned to one or more `club` scopes. May supervise authorized content and club lifecycle for those scopes, but cannot approve or publish.

### CMS System Administrator
May manage CMS-only custom role definitions and approved CMS role assignments. Closed-catalogue and application checks prevent S.I.M.S. permissions. This role does not collapse Editor, Reviewer, Approver or Publisher responsibilities.

## S.I.M.S. roles

### System Administrator
Full S.I.M.S. administration.

### School Administrator
Student/staff/academic/operational administration as assigned.

### Access Administrator
Assigns and revokes approved roles. Cannot create role definitions.

### Operational Staff
Read/update only within explicit assignment scopes. Final school roles and scope assignments are `DECISION REQUIRED`.

Academic, ICT and auditor role variants remain future school-policy decisions and are not active Phase 1B role definitions.

## Permission rules

1. Deny by default.
2. Check permissions on the server.
3. Scope records where applicable.
4. Do not rely on UI visibility.
5. Log sensitive changes.
6. Never grant broad permissions because they are convenient during development.

## Suggested permission naming

Use domain:action[:scope]

Examples:
- students:read
- students:update
- students:read:assigned
- assets:create
- assets:update
- assets:transfer
- assets:dispose
- content:publish
- content:approve
- audit:read

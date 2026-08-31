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
S.I.M.S. system/configuration administration and school-wide Phase 2B student, staff, class, subject and academic-session read/create/update. Does not inherit approved-role assignment authority.

### School Administrator
School-wide Phase 2B student, staff, class, subject and academic-session read/create/update. Does not inherit identity, access-role, custom-role or infrastructure administration.

### Access Administrator
Assigns and revokes approved roles. Cannot create role definitions and receives no Phase 2B confidential-record permission by implication.

### Operational Staff
Retains explicit assigned student read/update only. New staff/class/subject/session mappings and final school scope assignments are `DECISION REQUIRED`; no deletion is permitted.

Academic, ICT and auditor role variants remain future school-policy decisions and are not active Phase 1B role definitions.

## Phase 2C attendance design

No new attendance authority is active. The proposed `attendance:read/create/correct` school/assigned catalogue and exact role mappings remain `DECISION REQUIRED` in `docs/24-phase-2c-attendance.md`. Access Administrator, CMS roles and Web users receive no attendance access by implication. Existing `attendance:update:assigned` must not be interpreted as destructive correction authority.

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

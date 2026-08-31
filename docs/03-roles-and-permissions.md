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
S.I.M.S. system/configuration administration and school-wide Phase 2B student, staff, class, subject, and academic-session read/create/update, plus Phase 2C attendance read/create/correct. Does not inherit approved-role assignment authority.

### School Administrator
School-wide Phase 2B student, staff, class, subject, and academic-session read/create/update, plus Phase 2C attendance read/create/correct. Does not inherit identity, access-role, custom-role or infrastructure administration.

### Access Administrator
Assigns and revokes approved roles. Cannot create role definitions and receives no Phase 2B confidential-record or Phase 2C attendance permission by implication.

### Operational Staff
Retains explicit assigned student read/update only, and assigned class/session scope attendance read/create/correct. No deletion is permitted.

Academic, ICT and auditor role variants remain future school-policy decisions and are not active Phase 1B role definitions.

## Phase 2C attendance implementation

The following attendance permissions are active:
- `attendance:read:school` / `attendance:read:assigned`
- `attendance:create:school` / `attendance:create:assigned`
- `attendance:correct:school` / `attendance:correct:assigned`

Role mappings:
- **System Administrator** and **School Administrator** have school-wide read, create, and correct permissions.
- **Operational Staff** have assigned-scope read, create, and correct permissions.
- **Access Administrator**, **CMS roles**, and **Web users** have no attendance permissions.
- The pre-existing `attendance:update:assigned` permission is deprecated and replaced by the correct/create structure to prevent destructive overwrites.

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

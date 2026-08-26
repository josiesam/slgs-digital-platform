# Roles and Permissions

Use explicit permissions rather than relying only on role names.

## CMS roles

### Multimedia Club
Allowed:
- media:create
- media:update:own
- gallery:create
- gallery:update:own
- content:submit

Not allowed:
- publish
- approve
- access S.I.M.S.
- access student records

### News Journal Club
Allowed:
- article:create
- article:update:own
- media:create
- article:submit

Not allowed:
- publish
- approve
- access S.I.M.S.

### CMS Editor
Allowed:
- content:read
- content:update
- content:review
- content:approve
- content:reject
- content:schedule
- content:publish
- media:manage
- revisions:read

### CMS Administrator
All CMS permissions plus:
- cms_users:manage
- cms_settings:manage
- audit:read

## S.I.M.S. roles

### System Administrator
Full S.I.M.S. administration.

### School Administrator
Student/staff/academic/operational administration as assigned.

### Academic Staff
Only the student, class, subject, attendance, and assessment data necessary for their duties.

### ICT Administrator
ICT/STEM assets, locations, allocations, maintenance, repairs, procurement, disposal and related reports.

### ICT Technician
Operational asset inspection, maintenance, repair updates, and assigned inventory tasks.

### Read-only Auditor
Read access to explicitly approved reporting/audit surfaces; no mutation permissions.

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

# S.I.M.S. Agent Instructions

Scope: `apps/sims/**`

This is the private school administration application.

## Security posture

Treat every route as protected unless explicitly documented otherwise.

## Domains

- student administration
- staff
- academics
- attendance
- examinations/results
- administration
- ICT/STEM asset management

## Rules

- Authorization must be enforced on the server.
- Never trust role information supplied by the browser.
- Avoid returning fields that the current user does not need.
- Use audit logging for sensitive mutations.
- Never use real student data in fixtures or tests.
- Prefer immutable historical records for important events such as asset transfers and academic results.
- Asset lifecycle events should be traceable from acquisition through allocation, maintenance, repair, and disposal.
- QR/barcode identifiers must be unique and stable.

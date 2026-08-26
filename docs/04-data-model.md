# Data Model — Initial Domain Blueprint

This is a domain blueprint, not a final migration. Codex must validate relationships against implemented requirements before generating production migrations.

## Identity

- users
- roles
- permissions
- user_roles
- role_permissions
- sessions
- accounts
- audit_logs

## Public Content

- pages
- page_revisions
- articles
- article_revisions
- events
- galleries
- gallery_items
- media
- content_categories
- publication_events

Suggested common content fields:
- id
- slug
- title
- status
- author_id
- created_at
- updated_at
- published_at
- metadata

## School

- academic_years
- terms
- students
- guardians
- student_guardians
- staff
- departments
- classes
- class_memberships
- subjects
- class_subjects

## Academic

- assessments
- assessment_components
- assessment_results
- grading_scales

## Attendance

- attendance_sessions
- attendance_records

## Assets

- asset_categories
- assets
- asset_identifiers
- locations
- asset_assignments
- maintenance_plans
- maintenance_records
- repair_records
- suppliers
- procurement_records
- disposal_records
- asset_documents
- asset_photos

## Important relationships

- A student may have multiple guardians.
- A student may belong to different classes over time.
- A class may offer multiple subjects.
- Assessment results belong to a student and assessment context.
- An asset has a stable internal ID and may have a human-readable asset tag.
- Asset allocation is historical, not just a current `assigned_to` field.
- Maintenance and repair events should remain historically traceable.
- Media is reusable across public content.
- Content revisions should preserve editorial history.
- Published content is a state transition, not merely a boolean.

## Data safety

Do not use real student/staff data in development fixtures.

Prefer synthetic examples such as:
- Student A
- Student B
- ICT Asset 0001

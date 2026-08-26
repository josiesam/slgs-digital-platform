# Schema ownership

Phase 0 intentionally contains no database tables. Add domain schemas only with approved requirements and a reviewed migration.

Planned logical PostgreSQL schemas are `identity`, `content`, `school`, `academic`, `attendance`, `assets`, and `audit`. Runtime database roles must be granted only the schemas and operations required by their application.

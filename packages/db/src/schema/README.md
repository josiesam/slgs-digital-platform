# Schema ownership

Phase 0 intentionally contains no database tables. Add domain schemas only with approved requirements and a reviewed migration.

Active logical PostgreSQL schemas are `identity`, `cms`, and `public_content`. Runtime database roles must be granted only the schemas and operations required by CMS or the anonymous public read boundary.

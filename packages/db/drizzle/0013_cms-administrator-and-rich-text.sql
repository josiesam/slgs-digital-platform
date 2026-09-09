ALTER TABLE "cms"."content_item"
ADD COLUMN IF NOT EXISTS "body_rich_text" jsonb;
--> statement-breakpoint
CREATE OR REPLACE VIEW "public_content"."page"
WITH (security_barrier = true) AS
SELECT id, slug, title, summary, body, seo_title, seo_description,
       canonical_path, published_at, updated_at, body_rich_text
FROM cms.content_item
WHERE state = 'published' AND published_at IS NOT NULL AND type = 'page';
--> statement-breakpoint
CREATE OR REPLACE VIEW "public_content"."article"
WITH (security_barrier = true) AS
SELECT id, slug, title, summary, body, seo_title, seo_description,
       canonical_path, published_at, updated_at, body_rich_text
FROM cms.content_item
WHERE state = 'published' AND published_at IS NOT NULL AND type = 'article';
--> statement-breakpoint
CREATE OR REPLACE VIEW "public_content"."announcement"
WITH (security_barrier = true) AS
SELECT id, slug, title, summary, body, seo_title, seo_description,
       canonical_path, published_at, updated_at, body_rich_text
FROM cms.content_item
WHERE state = 'published' AND published_at IS NOT NULL AND type = 'announcement';
--> statement-breakpoint
CREATE OR REPLACE VIEW "public_content"."gallery"
WITH (security_barrier = true) AS
SELECT id, slug, title, summary, body, seo_title, seo_description,
       canonical_path, published_at, updated_at, body_rich_text
FROM cms.content_item
WHERE state = 'published' AND published_at IS NOT NULL AND type = 'gallery';
--> statement-breakpoint
CREATE OR REPLACE VIEW "public_content"."event"
WITH (security_barrier = true) AS
SELECT id, slug, title, summary, body, seo_title, seo_description,
       canonical_path, published_at, updated_at,
       event_start_at, event_end_at,
       event_location, event_organiser,
       body_rich_text
FROM cms.content_item
WHERE state = 'published' AND published_at IS NOT NULL AND type = 'event';
--> statement-breakpoint
GRANT SELECT ON "public_content"."page", "public_content"."article",
  "public_content"."announcement", "public_content"."gallery",
  "public_content"."event" TO slgs_web;
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET "permissions" = '["media:create:own","media:read:club","media:update:own","media:update:club","media:archive:own","media:archive:club","content:create:own","content:read:club","content:update:own","content:submit:own","page:create:own","page:update:own","page:submit:own","article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own","gallery:create:own","gallery:update:own","gallery:submit:own","content:read:assigned","content:update:assigned","content:submit:assigned","content:review:assigned","content:reject:assigned","content:approve:assigned","content:read:approved","content:publish:approved","content:unpublish:published","content:override:cms","membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","club:manage:assigned","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'cms' AND "key" = 'cms_administrator' AND "system_managed";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "cms"."enforce_content_workflow"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  administrator_override boolean :=
    current_setting('slgs.cms_administrator_override', true) = 'true';
BEGIN
  IF NEW.state <> OLD.state AND NOT (
    (OLD.state IN ('draft', 'rejected') AND NEW.state = 'submitted') OR
    (OLD.state = 'submitted' AND NEW.state = 'in_review') OR
    (OLD.state = 'in_review' AND NEW.state IN ('rejected', 'approved')) OR
    (OLD.state = 'approved' AND NEW.state = 'published') OR
    (OLD.state = 'published' AND NEW.state = 'approved')
  ) THEN
    RAISE EXCEPTION 'invalid CMS workflow transition: % to %', OLD.state, NEW.state;
  END IF;
  IF NOT administrator_override AND NEW.reviewed_by IS NOT NULL
     AND NEW.reviewed_by = NEW.author_user_id THEN
    RAISE EXCEPTION 'an author cannot review their own content';
  END IF;
  IF NOT administrator_override AND NEW.approved_by IS NOT NULL
     AND NEW.approved_by = NEW.author_user_id THEN
    RAISE EXCEPTION 'an author cannot approve their own content';
  END IF;
  IF NEW.state IN ('approved', 'published')
     AND (NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL) THEN
    RAISE EXCEPTION 'review completion is required before approval';
  END IF;
  IF NEW.state = 'published'
     AND (NEW.approved_at IS NULL OR NEW.approved_by IS NULL) THEN
    RAISE EXCEPTION 'approval is required before publication';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON "cms"."content_item" FROM slgs_web, slgs_sims;

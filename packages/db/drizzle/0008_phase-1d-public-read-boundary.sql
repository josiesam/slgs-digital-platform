CREATE SCHEMA "public_content";
--> statement-breakpoint
CREATE VIEW "public_content"."announcement" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'announcement'));--> statement-breakpoint
CREATE VIEW "public_content"."article" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'article'));--> statement-breakpoint
CREATE VIEW "public_content"."event" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at", "event_start_at", "event_end_at", "event_location", "event_organiser" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'event'));--> statement-breakpoint
CREATE VIEW "public_content"."gallery" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'gallery'));--> statement-breakpoint
CREATE VIEW "public_content"."page" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'page'));
--> statement-breakpoint
ALTER VIEW "public_content"."announcement" SET (security_barrier = true);--> statement-breakpoint
ALTER VIEW "public_content"."article" SET (security_barrier = true);--> statement-breakpoint
ALTER VIEW "public_content"."event" SET (security_barrier = true);--> statement-breakpoint
ALTER VIEW "public_content"."gallery" SET (security_barrier = true);--> statement-breakpoint
ALTER VIEW "public_content"."page" SET (security_barrier = true);--> statement-breakpoint
REVOKE ALL ON SCHEMA "public_content" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "public_content" FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public_content" TO slgs_web;--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA "public_content" TO slgs_web;--> statement-breakpoint
REVOKE ALL ON SCHEMA "public_content" FROM slgs_cms, slgs_sims;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "public_content" FROM slgs_cms, slgs_sims;

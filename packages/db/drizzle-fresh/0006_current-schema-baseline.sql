DROP VIEW "public_content"."announcement";--> statement-breakpoint
DROP VIEW "public_content"."article";--> statement-breakpoint
DROP VIEW "public_content"."event";--> statement-breakpoint
DROP VIEW "public_content"."gallery";--> statement-breakpoint
DROP VIEW "public_content"."media";--> statement-breakpoint
DROP VIEW "public_content"."page";--> statement-breakpoint
CREATE VIEW "public_content"."announcement" AS (select "cms"."content_item"."id", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'slug',
      "cms"."content_item"."slug"
    )
   as "slug", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'title',
      "cms"."content_item"."title"
    )
   as "title", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'summary',
      "cms"."content_item"."summary"
    )
   as "summary", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'body',
      "cms"."content_item"."body"
    )
   as "body", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoTitle',
      "cms"."content_item"."seo_title"
    )
   as "seoTitle", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoDescription',
      "cms"."content_item"."seo_description"
    )
   as "seoDescription", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'canonicalPath',
      "cms"."content_item"."canonical_path"
    )
   as "canonicalPath", "cms"."content_item"."published_at", "cms"."content_item"."updated_at" from "cms"."content_item" left join "cms"."content_revision" on ("cms"."content_revision"."content_id" = "cms"."content_item"."id" and "cms"."content_revision"."status" = 'published' and "cms"."content_revision"."verified_version_number" = "cms"."content_item"."verified_version") where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."content_item"."type" = 'announcement'));--> statement-breakpoint
CREATE VIEW "public_content"."article" AS (select "cms"."content_item"."id", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'slug',
      "cms"."content_item"."slug"
    )
   as "slug", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'title',
      "cms"."content_item"."title"
    )
   as "title", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'summary',
      "cms"."content_item"."summary"
    )
   as "summary", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'body',
      "cms"."content_item"."body"
    )
   as "body", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoTitle',
      "cms"."content_item"."seo_title"
    )
   as "seoTitle", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoDescription',
      "cms"."content_item"."seo_description"
    )
   as "seoDescription", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'canonicalPath',
      "cms"."content_item"."canonical_path"
    )
   as "canonicalPath", "cms"."content_item"."published_at", "cms"."content_item"."updated_at" from "cms"."content_item" left join "cms"."content_revision" on ("cms"."content_revision"."content_id" = "cms"."content_item"."id" and "cms"."content_revision"."status" = 'published' and "cms"."content_revision"."verified_version_number" = "cms"."content_item"."verified_version") where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."content_item"."type" = 'article'));--> statement-breakpoint
CREATE VIEW "public_content"."event" AS (select "cms"."content_item"."id", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'slug',
      "cms"."content_item"."slug"
    )
   as "slug", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'title',
      "cms"."content_item"."title"
    )
   as "title", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'summary',
      "cms"."content_item"."summary"
    )
   as "summary", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'body',
      "cms"."content_item"."body"
    )
   as "body", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoTitle',
      "cms"."content_item"."seo_title"
    )
   as "seoTitle", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoDescription',
      "cms"."content_item"."seo_description"
    )
   as "seoDescription", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'canonicalPath',
      "cms"."content_item"."canonical_path"
    )
   as "canonicalPath", "cms"."content_item"."published_at", "cms"."content_item"."updated_at", 
          coalesce(
            cast(
              "cms"."content_revision"."snapshot"->>'eventStartAt'
              as timestamptz
            ),
            "cms"."content_item"."event_start_at"
          )
         as "startAt", 
          coalesce(
            cast(
              "cms"."content_revision"."snapshot"->>'eventEndAt'
              as timestamptz
            ),
            "cms"."content_item"."event_end_at"
          )
         as "endAt", 
          coalesce(
            "cms"."content_revision"."snapshot"->>'eventLocation',
            "cms"."content_item"."event_location"
          )
         as "location", 
          coalesce(
            "cms"."content_revision"."snapshot"->>'eventOrganiser',
            "cms"."content_item"."event_organiser"
          )
         as "organiser" from "cms"."content_item" left join "cms"."content_revision" on ("cms"."content_revision"."content_id" = "cms"."content_item"."id" and "cms"."content_revision"."status" = 'published' and "cms"."content_revision"."verified_version_number" = "cms"."content_item"."verified_version") where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."content_item"."type" = 'event'));--> statement-breakpoint
CREATE VIEW "public_content"."gallery" AS (select "cms"."content_item"."id", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'slug',
      "cms"."content_item"."slug"
    )
   as "slug", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'title',
      "cms"."content_item"."title"
    )
   as "title", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'summary',
      "cms"."content_item"."summary"
    )
   as "summary", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'body',
      "cms"."content_item"."body"
    )
   as "body", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoTitle',
      "cms"."content_item"."seo_title"
    )
   as "seoTitle", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoDescription',
      "cms"."content_item"."seo_description"
    )
   as "seoDescription", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'canonicalPath',
      "cms"."content_item"."canonical_path"
    )
   as "canonicalPath", "cms"."content_item"."published_at", "cms"."content_item"."updated_at" from "cms"."content_item" left join "cms"."content_revision" on ("cms"."content_revision"."content_id" = "cms"."content_item"."id" and "cms"."content_revision"."status" = 'published' and "cms"."content_revision"."verified_version_number" = "cms"."content_item"."verified_version") where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."content_item"."type" = 'gallery'));--> statement-breakpoint
CREATE VIEW "public_content"."media" AS (select "cms"."content_media"."content_id", "cms"."media_asset"."id", "cms"."media_asset"."storage_key", "cms"."media_asset"."detected_mime_type", "cms"."media_asset"."alt_text", "cms"."media_asset"."caption", "cms"."media_asset"."width", "cms"."media_asset"."height", "cms"."content_media"."purpose", "cms"."content_media"."sort_order" from "cms"."content_media" inner join "cms"."media_asset" on "cms"."content_media"."media_id" = "cms"."media_asset"."id" inner join "cms"."content_item" on "cms"."content_media"."content_id" = "cms"."content_item"."id" where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."media_asset"."status" = 'available' and "cms"."media_asset"."archived_at" is null));--> statement-breakpoint
CREATE VIEW "public_content"."page" AS (select "cms"."content_item"."id", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'slug',
      "cms"."content_item"."slug"
    )
   as "slug", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'title',
      "cms"."content_item"."title"
    )
   as "title", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'summary',
      "cms"."content_item"."summary"
    )
   as "summary", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'body',
      "cms"."content_item"."body"
    )
   as "body", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoTitle',
      "cms"."content_item"."seo_title"
    )
   as "seoTitle", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'seoDescription',
      "cms"."content_item"."seo_description"
    )
   as "seoDescription", 
    coalesce(
      "cms"."content_revision"."snapshot"->>'canonicalPath',
      "cms"."content_item"."canonical_path"
    )
   as "canonicalPath", "cms"."content_item"."published_at", "cms"."content_item"."updated_at" from "cms"."content_item" left join "cms"."content_revision" on ("cms"."content_revision"."content_id" = "cms"."content_item"."id" and "cms"."content_revision"."status" = 'published' and "cms"."content_revision"."verified_version_number" = "cms"."content_item"."verified_version") where (("cms"."content_item"."published_at" is not null and "cms"."content_item"."verified_version" is not null) and "cms"."content_item"."type" = 'page'));
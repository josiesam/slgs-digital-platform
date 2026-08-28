CREATE SCHEMA "cms";
--> statement-breakpoint
CREATE TYPE "public"."cms_audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."cms_club_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_content_type" AS ENUM('page', 'article', 'event', 'announcement', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."cms_media_status" AS ENUM('pending', 'available', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_workflow_state" AS ENUM('draft', 'submitted', 'in_review', 'rejected', 'approved', 'published');--> statement-breakpoint
CREATE TABLE "cms"."club" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "cms_club_status" DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_club_key_unique" UNIQUE("key"),
	CONSTRAINT "cms_club_key_format" CHECK ("cms"."club"."key" ~ '^[a-z][a-z0-9_-]*$')
);
--> statement-breakpoint
CREATE TABLE "cms"."content_item" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "cms_content_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"canonical_path" text,
	"author_user_id" text NOT NULL,
	"owning_club_id" text,
	"state" "cms_workflow_state" DEFAULT 'draft' NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"event_start_at" timestamp with time zone,
	"event_end_at" timestamp with time zone,
	"event_location" text,
	"event_organiser" text,
	"featured_media_id" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"published_at" timestamp with time zone,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_content_slug_unique" UNIQUE("slug"),
	CONSTRAINT "cms_content_slug_format" CHECK ("cms"."content_item"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "cms_event_dates_valid" CHECK ("cms"."content_item"."type" <> 'event' or ("cms"."content_item"."event_start_at" is not null and ("cms"."content_item"."event_end_at" is null or "cms"."content_item"."event_end_at" >= "cms"."content_item"."event_start_at")))
);
--> statement-breakpoint
CREATE TABLE "cms"."content_media" (
	"content_id" text NOT NULL,
	"media_id" text NOT NULL,
	"purpose" text DEFAULT 'inline' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cms_content_media_unique" UNIQUE("content_id","media_id","purpose"),
	CONSTRAINT "cms_content_media_sort_nonnegative" CHECK ("cms"."content_media"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cms"."content_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_content_revision_unique" UNIQUE("content_id","revision")
);
--> statement-breakpoint
CREATE TABLE "cms"."editorial_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" text,
	"session_id" text,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"outcome" "cms_audit_outcome" NOT NULL,
	"reason_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preserve_until" timestamp with time zone,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms"."media_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"normalized_filename" text NOT NULL,
	"declared_mime_type" text NOT NULL,
	"detected_mime_type" text,
	"byte_size" integer NOT NULL,
	"checksum_sha256" text,
	"width" integer,
	"height" integer,
	"alt_text" text NOT NULL,
	"caption" text,
	"owner_user_id" text NOT NULL,
	"owning_club_id" text,
	"status" "cms_media_status" DEFAULT 'pending' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "cms_media_size_positive" CHECK ("cms"."media_asset"."byte_size" > 0),
	CONSTRAINT "cms_media_filename_safe" CHECK ("cms"."media_asset"."normalized_filename" !~ '[\\/]')
);
--> statement-breakpoint
CREATE TABLE "cms"."retention_policy" (
	"key" text PRIMARY KEY NOT NULL,
	"retention_days" integer,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms"."workflow_event" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"from_state" "cms_workflow_state",
	"to_state" "cms_workflow_state" NOT NULL,
	"actor_user_id" text NOT NULL,
	"comment" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms"."club" ADD CONSTRAINT "club_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_owning_club_id_club_id_fk" FOREIGN KEY ("owning_club_id") REFERENCES "cms"."club"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_media" ADD CONSTRAINT "content_media_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "cms"."content_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_media" ADD CONSTRAINT "content_media_media_id_media_asset_id_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media_asset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD CONSTRAINT "content_revision_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "cms"."content_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD CONSTRAINT "content_revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."media_asset" ADD CONSTRAINT "media_asset_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."media_asset" ADD CONSTRAINT "media_asset_owning_club_id_club_id_fk" FOREIGN KEY ("owning_club_id") REFERENCES "cms"."club"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."retention_policy" ADD CONSTRAINT "retention_policy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."workflow_event" ADD CONSTRAINT "workflow_event_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "cms"."content_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms"."workflow_event" ADD CONSTRAINT "workflow_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_club_status_idx" ON "cms"."club" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cms_content_state_type_idx" ON "cms"."content_item" USING btree ("state","type");--> statement-breakpoint
CREATE INDEX "cms_content_author_idx" ON "cms"."content_item" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "cms_content_club_idx" ON "cms"."content_item" USING btree ("owning_club_id");--> statement-breakpoint
CREATE INDEX "cms_content_published_idx" ON "cms"."content_item" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "cms_content_media_order_idx" ON "cms"."content_media" USING btree ("content_id","sort_order");--> statement-breakpoint
CREATE INDEX "cms_content_revision_created_idx" ON "cms"."content_revision" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cms_audit_occurred_idx" ON "cms"."editorial_audit_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "cms_audit_resource_idx" ON "cms"."editorial_audit_event" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "cms_audit_preserve_idx" ON "cms"."editorial_audit_event" USING btree ("preserve_until");--> statement-breakpoint
CREATE INDEX "cms_media_status_idx" ON "cms"."media_asset" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cms_media_owner_idx" ON "cms"."media_asset" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "cms_media_club_idx" ON "cms"."media_asset" USING btree ("owning_club_id");--> statement-breakpoint
CREATE INDEX "cms_workflow_content_time_idx" ON "cms"."workflow_event" USING btree ("content_id","occurred_at");--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD CONSTRAINT "content_item_featured_media_id_media_asset_id_fk" FOREIGN KEY ("featured_media_id") REFERENCES "cms"."media_asset"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cms"."retention_policy" ADD CONSTRAINT "cms_retention_days_positive" CHECK ("retention_days" IS NULL OR "retention_days" > 0);--> statement-breakpoint
INSERT INTO "cms"."retention_policy" (key, retention_days, enabled)
VALUES ('editorial_audit', NULL, false)
ON CONFLICT (key) DO NOTHING;--> statement-breakpoint
CREATE FUNCTION "cms"."enforce_content_workflow"() RETURNS trigger
LANGUAGE plpgsql AS $$
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
  IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = NEW.author_user_id THEN
    RAISE EXCEPTION 'an author cannot review their own content';
  END IF;
  IF NEW.approved_by IS NOT NULL AND NEW.approved_by = NEW.author_user_id THEN
    RAISE EXCEPTION 'an author cannot approve their own content';
  END IF;
  IF NEW.state IN ('approved', 'published') AND (NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL) THEN
    RAISE EXCEPTION 'review completion is required before approval';
  END IF;
  IF NEW.state = 'published' AND (NEW.approved_at IS NULL OR NEW.approved_by IS NULL) THEN
    RAISE EXCEPTION 'approval is required before publication';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "cms_content_workflow_guard"
BEFORE UPDATE ON "cms"."content_item"
FOR EACH ROW EXECUTE FUNCTION "cms"."enforce_content_workflow"();--> statement-breakpoint
CREATE FUNCTION "cms"."prevent_audit_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CMS audit events are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "cms_editorial_audit_immutable"
BEFORE UPDATE OR DELETE ON "cms"."editorial_audit_event"
FOR EACH ROW EXECUTE FUNCTION "cms"."prevent_audit_mutation"();--> statement-breakpoint
GRANT USAGE ON SCHEMA "cms" TO slgs_cms;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON
  "cms"."club",
  "cms"."content_item",
  "cms"."content_revision",
  "cms"."workflow_event",
  "cms"."media_asset",
  "cms"."content_media",
  "cms"."retention_policy"
TO slgs_cms;--> statement-breakpoint
GRANT SELECT, INSERT ON "cms"."editorial_audit_event" TO slgs_cms;--> statement-breakpoint
REVOKE ALL ON SCHEMA "cms" FROM slgs_web, slgs_sims;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "cms" FROM slgs_web, slgs_sims;--> statement-breakpoint
INSERT INTO "identity"."role_definition"
  (id, application, key, name, description, permissions, scope_dimensions, system_managed, active)
VALUES
  ('system:cms_multimedia_club_supervisor', 'cms', 'cms_multimedia_club_supervisor', 'Multimedia Club Supervisor', 'Explicit club-scoped multimedia leadership role.', '["media:create:own","media:read:club","media:update:club","media:archive:club","content:create:own","content:read:club","content:update:assigned","content:submit:assigned","gallery:create:own","gallery:update:own","gallery:submit:own","club:read:cms","club:manage:assigned"]', '["club"]', true, true),
  ('system:cms_news_journal_club_supervisor', 'cms', 'cms_news_journal_club_supervisor', 'News Journal Club Supervisor', 'Explicit club-scoped journalism leadership role.', '["article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own","content:read:club","content:update:assigned","content:submit:assigned","club:read:cms","club:manage:assigned"]', '["club"]', true, true),
  ('system:cms_system_administrator', 'cms', 'cms_system_administrator', 'CMS System Administrator', 'CMS-scoped role-definition, assignment and configuration administration.', '["membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms"]', '[]', true, true)
ON CONFLICT (application, key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  scope_dimensions = EXCLUDED.scope_dimensions,
  system_managed = true,
  active = true,
  updated_at = now();--> statement-breakpoint
UPDATE "identity"."role_definition"
SET permissions = '["article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own"]'::jsonb,
    updated_at = now()
WHERE application = 'cms' AND key = 'cms_news_journal_club';
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET permissions = '["page:create:own","page:update:own","page:submit:own","content:read:assigned","content:update:assigned","content:submit:assigned"]'::jsonb,
    updated_at = now()
WHERE application = 'cms' AND key = 'cms_editor';
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET permissions = '["media:create:own","media:read:club","media:update:own","media:archive:own","content:create:own","content:read:club","content:update:own","content:submit:own"]'::jsonb,
    updated_at = now()
WHERE application = 'cms' AND key = 'cms_multimedia_club';

CREATE SCHEMA "cms";
--> statement-breakpoint
CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE SCHEMA "public_content";
--> statement-breakpoint
CREATE TYPE "public"."cms_audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."cms_club_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_content_type" AS ENUM('page', 'article', 'event', 'announcement', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."cms_media_status" AS ENUM('pending', 'available', 'rejected', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_workflow_state" AS ENUM('draft', 'submitted', 'in_review', 'rejected', 'approved', 'published');--> statement-breakpoint
CREATE TYPE "public"."application_name" AS ENUM('cms');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."authorization_scope_dimension" AS ENUM('club', 'organisation');--> statement-breakpoint
CREATE TYPE "public"."bootstrap_status" AS ENUM('pending', 'approved', 'rejected', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('pending', 'active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
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
	CONSTRAINT "cms_media_checksum_format" CHECK ("cms"."media_asset"."checksum_sha256" is null or "cms"."media_asset"."checksum_sha256" ~ '^[0-9a-f]{64}$'),
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
CREATE TABLE "identity"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_account_issuer_unique" UNIQUE("issuer","account_id")
);
--> statement-breakpoint
CREATE TABLE "identity"."application_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application" "application_name" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_membership_user_application_unique" UNIQUE("user_id","application")
);
--> statement-breakpoint
CREATE TABLE "identity"."approved_contact_domain" (
	"domain" text PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"managed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_contact_domain_lowercase" CHECK ("identity"."approved_contact_domain"."domain" = lower("identity"."approved_contact_domain"."domain"))
);
--> statement-breakpoint
CREATE TABLE "identity"."privileged_bootstrap" (
	"id" text PRIMARY KEY NOT NULL,
	"initiated_by" text NOT NULL,
	"approved_by" text,
	"target_user_id" text NOT NULL,
	"application" "application_name" NOT NULL,
	"role_key" text NOT NULL,
	"status" "bootstrap_status" DEFAULT 'pending' NOT NULL,
	"outcome_reason" text,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "identity_bootstrap_distinct_approvers" CHECK ("identity"."privileged_bootstrap"."approved_by" is null or "identity"."privileged_bootstrap"."approved_by" <> "identity"."privileged_bootstrap"."initiated_by")
);
--> statement-breakpoint
CREATE TABLE "identity"."role_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"membership_id" text NOT NULL,
	"role_definition_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_by" text,
	"revoked_at" timestamp with time zone,
	"reason" text,
	CONSTRAINT "identity_role_assignment_revocation_complete" CHECK (("identity"."role_assignment"."revoked_at" is null and "identity"."role_assignment"."revoked_by" is null) or ("identity"."role_assignment"."revoked_at" is not null and "identity"."role_assignment"."revoked_by" is not null))
);
--> statement-breakpoint
CREATE TABLE "identity"."role_assignment_scope" (
	"id" text PRIMARY KEY NOT NULL,
	"role_assignment_id" text NOT NULL,
	"dimension" "authorization_scope_dimension" NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_assignment_scope_unique" UNIQUE("role_assignment_id","dimension","value"),
	CONSTRAINT "identity_assignment_scope_value_nonempty" CHECK (length(trim("identity"."role_assignment_scope"."value")) > 0)
);
--> statement-breakpoint
CREATE TABLE "identity"."role_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"application" "application_name" NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"system_managed" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_role_application_key_unique" UNIQUE("application","key")
);
--> statement-breakpoint
CREATE TABLE "identity"."security_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"application" "application_name",
	"actor_user_id" text,
	"session_id" text,
	"target_type" text NOT NULL,
	"target_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"reason_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "identity_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "identity"."two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "identity_two_factor_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "identity"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"person_reference" text NOT NULL,
	"status" "identity_status" DEFAULT 'pending' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_user_email_unique" UNIQUE("email"),
	CONSTRAINT "identity_user_person_reference_unique" UNIQUE("person_reference")
);
--> statement-breakpoint
CREATE TABLE "identity"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
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
ALTER TABLE "identity"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."application_membership" ADD CONSTRAINT "application_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."privileged_bootstrap" ADD CONSTRAINT "privileged_bootstrap_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_membership_id_application_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "identity"."application_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_role_definition_id_role_definition_id_fk" FOREIGN KEY ("role_definition_id") REFERENCES "identity"."role_definition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment_scope" ADD CONSTRAINT "role_assignment_scope_role_assignment_id_role_assignment_id_fk" FOREIGN KEY ("role_assignment_id") REFERENCES "identity"."role_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "identity_account_user_idx" ON "identity"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identity_membership_application_status_idx" ON "identity"."application_membership" USING btree ("application","status");--> statement-breakpoint
CREATE INDEX "identity_bootstrap_application_status_idx" ON "identity"."privileged_bootstrap" USING btree ("application","status");--> statement-breakpoint
CREATE INDEX "identity_role_assignment_membership_idx" ON "identity"."role_assignment" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_active_role_assignment_unique" ON "identity"."role_assignment" USING btree ("membership_id","role_definition_id") WHERE "identity"."role_assignment"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "identity_assignment_scope_lookup_idx" ON "identity"."role_assignment_scope" USING btree ("dimension","value");--> statement-breakpoint
CREATE INDEX "identity_audit_occurred_at_idx" ON "identity"."security_audit_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "identity_audit_actor_idx" ON "identity"."security_audit_event" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "identity_audit_target_idx" ON "identity"."security_audit_event" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "identity_session_user_idx" ON "identity"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identity_session_expiry_idx" ON "identity"."session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "identity_user_status_idx" ON "identity"."user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "identity_verification_identifier_idx" ON "identity"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE VIEW "public_content"."announcement" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'announcement'));--> statement-breakpoint
CREATE VIEW "public_content"."article" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'article'));--> statement-breakpoint
CREATE VIEW "public_content"."event" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at", "event_start_at", "event_end_at", "event_location", "event_organiser" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'event'));--> statement-breakpoint
CREATE VIEW "public_content"."gallery" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'gallery'));--> statement-breakpoint
CREATE VIEW "public_content"."page" AS (select "id", "slug", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "published_at", "updated_at" from "cms"."content_item" where (("cms"."content_item"."state" = 'published' and "cms"."content_item"."published_at" is not null) and "cms"."content_item"."type" = 'page'));
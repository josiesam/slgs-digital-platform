ALTER TYPE "public"."cms_workflow_state" ADD VALUE IF NOT EXISTS 'requires_rebase';--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD COLUMN IF NOT EXISTS "current_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD COLUMN IF NOT EXISTS "current_base_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "cms"."content_item" ADD COLUMN IF NOT EXISTS "verified_version" integer;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "revision_label" text DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "snapshot_id" text DEFAULT concat('snap_', gen_random_uuid()::text) NOT NULL;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "base_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "status" "public"."cms_workflow_state" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "rebased_from_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "cms"."content_revision" ADD COLUMN IF NOT EXISTS "verified_version_number" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_content_revision_base_idx" ON "cms"."content_revision" USING btree ("base_snapshot_id");--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cms_content_snapshot_unique') THEN
        ALTER TABLE "cms"."content_revision" ADD CONSTRAINT "cms_content_snapshot_unique" UNIQUE("snapshot_id");
    END IF;
END $$;
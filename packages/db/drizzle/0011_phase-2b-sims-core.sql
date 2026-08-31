CREATE SCHEMA IF NOT EXISTS "sims";
--> statement-breakpoint
CREATE TYPE "public"."sims_record_status" AS ENUM ('active', 'inactive', 'archived');
--> statement-breakpoint
CREATE TYPE "public"."sims_academic_session_status" AS ENUM ('planned', 'active', 'closed');
--> statement-breakpoint
CREATE TABLE "sims"."academic_session" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "sims_academic_session_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_academic_session_name_unique" UNIQUE("name"),
	CONSTRAINT "sims_academic_session_dates_valid" CHECK ("end_date" >= "start_date")
);
--> statement-breakpoint
CREATE TABLE "sims"."academic_class" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_session_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" "sims_record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_academic_class_session_code_unique" UNIQUE("academic_session_id", "code")
);
--> statement-breakpoint
CREATE TABLE "sims"."subject" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_session_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "sims_record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_subject_session_code_unique" UNIQUE("academic_session_id", "code")
);
--> statement-breakpoint
CREATE TABLE "sims"."student" (
	"id" text PRIMARY KEY NOT NULL,
	"student_number" text NOT NULL,
	"admission_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"status" "sims_record_status" DEFAULT 'active' NOT NULL,
	"admitted_on" date,
	"class_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_student_number_unique" UNIQUE("student_number"),
	CONSTRAINT "sims_student_admission_number_unique" UNIQUE("admission_number")
);
--> statement-breakpoint
CREATE TABLE "sims"."staff" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"identity_user_id" text,
	"status" "sims_record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_staff_number_unique" UNIQUE("staff_number"),
	CONSTRAINT "sims_staff_identity_user_unique" UNIQUE("identity_user_id")
);
--> statement-breakpoint
ALTER TABLE "sims"."academic_class" ADD CONSTRAINT "sims_academic_class_session_fk" FOREIGN KEY ("academic_session_id") REFERENCES "sims"."academic_session"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "sims"."subject" ADD CONSTRAINT "sims_subject_session_fk" FOREIGN KEY ("academic_session_id") REFERENCES "sims"."academic_session"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "sims"."student" ADD CONSTRAINT "sims_student_class_fk" FOREIGN KEY ("class_id") REFERENCES "sims"."academic_class"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "sims"."staff" ADD CONSTRAINT "sims_staff_identity_user_fk" FOREIGN KEY ("identity_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE INDEX "sims_academic_session_status_idx" ON "sims"."academic_session" USING btree ("status");
CREATE INDEX "sims_academic_class_session_status_idx" ON "sims"."academic_class" USING btree ("academic_session_id", "status");
CREATE INDEX "sims_subject_session_status_idx" ON "sims"."subject" USING btree ("academic_session_id", "status");
CREATE INDEX "sims_student_class_status_idx" ON "sims"."student" USING btree ("class_id", "status");
CREATE INDEX "sims_student_name_idx" ON "sims"."student" USING btree ("last_name", "first_name");
CREATE INDEX "sims_staff_status_name_idx" ON "sims"."staff" USING btree ("status", "last_name", "first_name");
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET "permissions" = '["student:read:school","student:create:school","student:update:school","staff:read:school","staff:create:school","staff:update:school","class:read:school","class:create:school","class:update:school","subject:read:school","subject:create:school","subject:update:school","academic_session:read:school","academic_session:create:school","academic_session:update:school","attendance:read:school","assessment:read:school","report:read:school","assignment:manage:school"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'sims' AND "key" = 'sims_school_administrator' AND "system_managed";
UPDATE "identity"."role_definition"
SET "permissions" = '["identity:manage:sims","role:create:sims","role:update:sims","role:deactivate:sims","configuration:manage:sims","audit:read:sims","student:read:school","student:create:school","student:update:school","staff:read:school","staff:create:school","staff:update:school","class:read:school","class:create:school","class:update:school","subject:read:school","subject:create:school","subject:update:school","academic_session:read:school","academic_session:create:school","academic_session:update:school"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'sims' AND "key" = 'sims_system_administrator' AND "system_managed";
--> statement-breakpoint
GRANT USAGE ON SCHEMA "sims" TO slgs_sims;
GRANT USAGE ON TYPE "public"."sims_record_status", "public"."sims_academic_session_status" TO slgs_sims;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA "sims" TO slgs_sims;
REVOKE ALL ON SCHEMA "sims" FROM slgs_web, slgs_cms;
REVOKE ALL ON ALL TABLES IN SCHEMA "sims" FROM slgs_web, slgs_cms;
--> statement-breakpoint
ALTER TABLE "sims"."academic_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sims"."academic_class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sims"."subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sims"."student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sims"."staff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sims_runtime_access" ON "sims"."academic_session" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
CREATE POLICY "sims_runtime_access" ON "sims"."academic_class" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
CREATE POLICY "sims_runtime_access" ON "sims"."subject" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
CREATE POLICY "sims_runtime_access" ON "sims"."student" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
CREATE POLICY "sims_runtime_access" ON "sims"."staff" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');

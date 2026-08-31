CREATE TYPE "public"."sims_attendance_occurrence_status" AS ENUM('active', 'finalized');
--> statement-breakpoint
CREATE TYPE "public"."sims_attendance_state" AS ENUM('present', 'absent', 'late', 'excused');
--> statement-breakpoint
CREATE TABLE "sims"."attendance_occurrence" (
	"id" text PRIMARY KEY NOT NULL,
	"academic_session_id" text NOT NULL,
	"class_id" text NOT NULL,
	"attendance_date" date NOT NULL,
	"status" "sims_attendance_occurrence_status" DEFAULT 'active' NOT NULL,
	"recorder_user_id" text NOT NULL,
	"recorder_staff_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_attendance_occurrence_unique" UNIQUE("academic_session_id","class_id","attendance_date")
);
--> statement-breakpoint
CREATE TABLE "sims"."attendance_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"occurrence_id" text NOT NULL,
	"student_id" text NOT NULL,
	"state" "sims_attendance_state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sims_attendance_entry_student_unique" UNIQUE("occurrence_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "sims"."attendance_correction" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"state" "sims_attendance_state" NOT NULL,
	"actor_user_id" text NOT NULL,
	"actor_staff_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sims"."attendance_occurrence" ADD CONSTRAINT "attendance_occurrence_academic_session_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "sims"."academic_session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_occurrence" ADD CONSTRAINT "attendance_occurrence_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "sims"."academic_class"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_occurrence" ADD CONSTRAINT "attendance_occurrence_recorder_user_id_fk" FOREIGN KEY ("recorder_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_occurrence" ADD CONSTRAINT "attendance_occurrence_recorder_staff_id_fk" FOREIGN KEY ("recorder_staff_id") REFERENCES "sims"."staff"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_entry" ADD CONSTRAINT "attendance_entry_occurrence_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "sims"."attendance_occurrence"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_entry" ADD CONSTRAINT "attendance_entry_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "sims"."student"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_correction" ADD CONSTRAINT "attendance_correction_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "sims"."attendance_entry"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_correction" ADD CONSTRAINT "attendance_correction_actor_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_correction" ADD CONSTRAINT "attendance_correction_actor_staff_id_fk" FOREIGN KEY ("actor_staff_id") REFERENCES "sims"."staff"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sims_attendance_occurrence_lookup_idx" ON "sims"."attendance_occurrence" USING btree ("class_id","attendance_date");
--> statement-breakpoint
CREATE INDEX "sims_attendance_correction_entry_idx" ON "sims"."attendance_correction" USING btree ("entry_id");
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET "permissions" = '["student:read:school","student:create:school","student:update:school","staff:read:school","staff:create:school","staff:update:school","class:read:school","class:create:school","class:update:school","subject:read:school","subject:create:school","subject:update:school","academic_session:read:school","academic_session:create:school","academic_session:update:school","attendance:read:school","attendance:create:school","attendance:correct:school","assessment:read:school","report:read:school","assignment:manage:school"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'sims' AND "key" = 'sims_school_administrator' AND "system_managed";
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET "permissions" = '["identity:manage:sims","role:create:sims","role:update:sims","role:deactivate:sims","configuration:manage:sims","audit:read:sims","student:read:school","student:create:school","student:update:school","staff:read:school","staff:create:school","staff:update:school","class:read:school","class:create:school","class:update:school","subject:read:school","subject:create:school","subject:update:school","academic_session:read:school","academic_session:create:school","academic_session:update:school","attendance:read:school","attendance:create:school","attendance:correct:school"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'sims' AND "key" = 'sims_system_administrator' AND "system_managed";
--> statement-breakpoint
UPDATE "identity"."role_definition"
SET "permissions" = '["student:read:assigned","student:update:assigned","attendance:read:assigned","attendance:create:assigned","attendance:correct:assigned","attendance:update:assigned"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'sims' AND "key" = 'sims_operational_staff' AND "system_managed";
--> statement-breakpoint
GRANT USAGE ON TYPE "public"."sims_attendance_occurrence_status", "public"."sims_attendance_state" TO slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "sims"."attendance_occurrence", "sims"."attendance_entry", "sims"."attendance_correction" TO slgs_sims;
--> statement-breakpoint
REVOKE ALL ON "sims"."attendance_occurrence", "sims"."attendance_entry", "sims"."attendance_correction" FROM slgs_web, slgs_cms;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_occurrence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_entry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sims"."attendance_correction" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "sims_runtime_access" ON "sims"."attendance_occurrence" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
--> statement-breakpoint
CREATE POLICY "sims_runtime_access" ON "sims"."attendance_entry" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');
--> statement-breakpoint
CREATE POLICY "sims_runtime_access" ON "sims"."attendance_correction" FOR ALL TO slgs_sims USING (current_user = 'slgs_sims') WITH CHECK (current_user = 'slgs_sims');

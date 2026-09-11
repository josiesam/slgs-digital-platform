-- Decommission the discontinued S.I.M.S. product without rewriting migration history.
-- This migration is repository cleanup only; production execution requires an approved
-- backup, data-retention decision, and explicit Senior Software Engineer sign-off.

DROP TRIGGER IF EXISTS "role_assignment_sims_admin_limit" ON "identity"."role_assignment";
DROP TRIGGER IF EXISTS "membership_sims_admin_limit" ON "identity"."application_membership";
DROP TRIGGER IF EXISTS "user_sims_admin_limit" ON "identity"."user";
DROP TRIGGER IF EXISTS "role_definition_sims_admin_limit" ON "identity"."role_definition";
DROP FUNCTION IF EXISTS "identity"."enforce_sims_system_administrator_limit"();
--> statement-breakpoint
DELETE FROM "identity"."role_assignment_scope"
WHERE "role_assignment_id" IN (
  SELECT assignment."id"
  FROM "identity"."role_assignment" assignment
  JOIN "identity"."application_membership" membership
    ON membership."id" = assignment."membership_id"
  WHERE membership."application" = 'sims'
);
DELETE FROM "identity"."role_assignment"
WHERE "membership_id" IN (
  SELECT "id" FROM "identity"."application_membership" WHERE "application" = 'sims'
);
DELETE FROM "identity"."application_membership" WHERE "application" = 'sims';
DELETE FROM "identity"."role_definition" WHERE "application" = 'sims';
DELETE FROM "identity"."privileged_bootstrap" WHERE "application" = 'sims';
--> statement-breakpoint
DROP SCHEMA IF EXISTS "sims" CASCADE;
DROP TYPE IF EXISTS "public"."sims_attendance_state";
DROP TYPE IF EXISTS "public"."sims_attendance_occurrence_status";
DROP TYPE IF EXISTS "public"."sims_academic_session_status";
DROP TYPE IF EXISTS "public"."sims_record_status";
--> statement-breakpoint
DROP POLICY IF EXISTS "runtime_membership_application_isolation" ON "identity"."application_membership";
CREATE POLICY "runtime_membership_application_isolation"
ON "identity"."application_membership"
USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin')
WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');
DROP POLICY IF EXISTS "runtime_role_definition_application_isolation" ON "identity"."role_definition";
CREATE POLICY "runtime_role_definition_application_isolation"
ON "identity"."role_definition"
USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin')
WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');
DROP POLICY IF EXISTS "runtime_security_audit_application_isolation" ON "identity"."security_audit_event";
CREATE POLICY "runtime_security_audit_application_isolation"
ON "identity"."security_audit_event"
USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin')
WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "identity"."user" TO slgs_cms;
GRANT INSERT ON "identity"."account" TO slgs_cms;
GRANT DELETE ON "identity"."session" TO slgs_cms;
UPDATE "identity"."role_definition"
SET "permissions" = '["membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms","user:read:cms","user:create:cms","user:update:cms","user:deactivate:cms","session:revoke:cms"]'::jsonb,
    "updated_at" = now()
WHERE "application" = 'cms' AND "key" = 'cms_system_administrator' AND "system_managed";
--> statement-breakpoint
DO $$
BEGIN
  IF to_regrole('slgs_sims') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "identity", "cms", "public_content" FROM slgs_sims';
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA "identity", "cms", "public_content" FROM slgs_sims';
    EXECUTE 'REVOKE ALL ON TYPE "public"."application_name", "public"."authorization_scope_dimension" FROM slgs_sims';
    EXECUTE 'DROP OWNED BY slgs_sims';
  END IF;
END $$;
DROP ROLE IF EXISTS slgs_sims;

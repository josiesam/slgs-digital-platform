ALTER TABLE "identity"."application_membership" DROP CONSTRAINT "application_membership_approved_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" DROP CONSTRAINT "role_assignment_assigned_by_user_id_fk";

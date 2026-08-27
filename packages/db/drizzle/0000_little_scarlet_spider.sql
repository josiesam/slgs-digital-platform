CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TYPE "public"."application_name" AS ENUM('cms', 'sims');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."bootstrap_status" AS ENUM('pending', 'approved', 'rejected', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('pending', 'active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TABLE "identity"."account" (
	"id" text PRIMARY KEY NOT NULL,
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
	CONSTRAINT "identity_account_provider_unique" UNIQUE("provider_id","account_id")
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
CREATE TABLE "identity"."role_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"application" "application_name" NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
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
ALTER TABLE "identity"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."application_membership" ADD CONSTRAINT "application_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."application_membership" ADD CONSTRAINT "application_membership_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."privileged_bootstrap" ADD CONSTRAINT "privileged_bootstrap_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_membership_id_application_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "identity"."application_membership"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_role_definition_id_role_definition_id_fk" FOREIGN KEY ("role_definition_id") REFERENCES "identity"."role_definition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment" ADD CONSTRAINT "role_assignment_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "identity"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_account_user_idx" ON "identity"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identity_membership_application_status_idx" ON "identity"."application_membership" USING btree ("application","status");--> statement-breakpoint
CREATE INDEX "identity_bootstrap_application_status_idx" ON "identity"."privileged_bootstrap" USING btree ("application","status");--> statement-breakpoint
CREATE INDEX "identity_role_assignment_membership_idx" ON "identity"."role_assignment" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "identity_audit_occurred_at_idx" ON "identity"."security_audit_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "identity_audit_actor_idx" ON "identity"."security_audit_event" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "identity_audit_target_idx" ON "identity"."security_audit_event" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "identity_session_user_idx" ON "identity"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identity_session_expiry_idx" ON "identity"."session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "identity_user_status_idx" ON "identity"."user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "identity_verification_identifier_idx" ON "identity"."verification" USING btree ("identifier");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "identity"."enforce_role_application_boundary"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	membership_application "application_name";
	role_application "application_name";
BEGIN
	SELECT "application" INTO membership_application
	FROM "identity"."application_membership"
	WHERE "id" = NEW."membership_id";

	SELECT "application" INTO role_application
	FROM "identity"."role_definition"
	WHERE "id" = NEW."role_definition_id";

	IF membership_application IS DISTINCT FROM role_application THEN
		RAISE EXCEPTION 'role application must match membership application';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "role_assignment_application_boundary"
BEFORE INSERT OR UPDATE OF "membership_id", "role_definition_id"
ON "identity"."role_assignment"
FOR EACH ROW EXECUTE FUNCTION "identity"."enforce_role_application_boundary"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "identity"."enforce_sims_system_administrator_limit"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	active_administrators integer;
BEGIN
	PERFORM pg_advisory_xact_lock(73547, 5);

	SELECT count(DISTINCT membership."user_id") INTO active_administrators
	FROM "identity"."role_assignment" assignment
	JOIN "identity"."role_definition" role
		ON role."id" = assignment."role_definition_id"
	JOIN "identity"."application_membership" membership
		ON membership."id" = assignment."membership_id"
	JOIN "identity"."user" identity_user
		ON identity_user."id" = membership."user_id"
	WHERE role."application" = 'sims'
		AND role."key" = 'sims_system_administrator'
		AND role."active" = true
		AND membership."application" = 'sims'
		AND membership."status" = 'active'
		AND identity_user."status" = 'active'
		AND assignment."revoked_at" IS NULL;

	IF active_administrators > 5 THEN
		RAISE EXCEPTION 'at most five active S.I.M.S. System Administrators are allowed';
	END IF;
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "role_assignment_sims_admin_limit"
AFTER INSERT OR UPDATE OR DELETE ON "identity"."role_assignment"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION "identity"."enforce_sims_system_administrator_limit"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "membership_sims_admin_limit"
AFTER INSERT OR UPDATE OR DELETE ON "identity"."application_membership"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION "identity"."enforce_sims_system_administrator_limit"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "user_sims_admin_limit"
AFTER INSERT OR UPDATE OR DELETE ON "identity"."user"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION "identity"."enforce_sims_system_administrator_limit"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "role_definition_sims_admin_limit"
AFTER INSERT OR UPDATE OR DELETE ON "identity"."role_definition"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION "identity"."enforce_sims_system_administrator_limit"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "identity"."revoke_sessions_for_inactive_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."status" IN ('suspended', 'deactivated')
		AND OLD."status" IS DISTINCT FROM NEW."status" THEN
		DELETE FROM "identity"."session" WHERE "user_id" = NEW."id";
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "user_inactive_session_revocation"
AFTER UPDATE OF "status" ON "identity"."user"
FOR EACH ROW EXECUTE FUNCTION "identity"."revoke_sessions_for_inactive_identity"();

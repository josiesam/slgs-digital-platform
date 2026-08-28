CREATE TYPE "public"."authorization_scope_dimension" AS ENUM('club', 'class', 'subject', 'department', 'academic_session', 'term', 'organisation', 'location');--> statement-breakpoint
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
ALTER TABLE "identity"."role_definition" ADD COLUMN "scope_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "identity"."role_assignment_scope" ADD CONSTRAINT "role_assignment_scope_role_assignment_id_role_assignment_id_fk" FOREIGN KEY ("role_assignment_id") REFERENCES "identity"."role_assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_assignment_scope_lookup_idx" ON "identity"."role_assignment_scope" USING btree ("dimension","value");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_active_role_assignment_unique" ON "identity"."role_assignment" USING btree ("membership_id","role_definition_id") WHERE "identity"."role_assignment"."revoked_at" is null;
--> statement-breakpoint
GRANT USAGE ON TYPE "public"."authorization_scope_dimension" TO slgs_cms, slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "identity"."application_membership" TO slgs_cms, slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "identity"."role_assignment" TO slgs_cms, slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT ON "identity"."role_assignment_scope" TO slgs_cms, slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT ON "identity"."role_assignment_scope" TO slgs_platform_admin;
--> statement-breakpoint
GRANT INSERT ON "identity"."security_audit_event" TO slgs_cms, slgs_sims;
--> statement-breakpoint
GRANT INSERT, UPDATE ON "identity"."role_definition" TO slgs_sims;
--> statement-breakpoint
ALTER TABLE "identity"."application_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."role_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."role_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."role_assignment_scope" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "runtime_membership_application_isolation"
ON "identity"."application_membership"
USING (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND application = 'sims') OR
  current_user = 'slgs_platform_admin'
)
WITH CHECK (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND application = 'sims') OR
  current_user = 'slgs_platform_admin'
);
--> statement-breakpoint
CREATE POLICY "runtime_role_definition_application_isolation"
ON "identity"."role_definition"
USING (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND application = 'sims') OR
  current_user = 'slgs_platform_admin'
)
WITH CHECK (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND application = 'sims') OR
  current_user = 'slgs_platform_admin'
);
--> statement-breakpoint
CREATE POLICY "runtime_role_assignment_application_isolation"
ON "identity"."role_assignment"
USING (EXISTS (
  SELECT 1 FROM "identity"."application_membership" membership
  WHERE membership.id = membership_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "identity"."application_membership" membership
  WHERE membership.id = membership_id
));
--> statement-breakpoint
CREATE POLICY "runtime_assignment_scope_application_isolation"
ON "identity"."role_assignment_scope"
USING (EXISTS (
  SELECT 1 FROM "identity"."role_assignment" assignment
  WHERE assignment.id = role_assignment_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "identity"."role_assignment" assignment
  WHERE assignment.id = role_assignment_id
));
--> statement-breakpoint
INSERT INTO "identity"."role_definition"
  (id, application, key, name, description, permissions, scope_dimensions, system_managed, active)
VALUES
  ('system:cms_multimedia_club', 'cms', 'cms_multimedia_club', 'Multimedia Club', 'Club-scoped multimedia contribution role.', '["media:create:own","media:read:club","media:update:own","content:create:own","content:read:club","content:update:own","content:submit:own"]', '["club"]', true, true),
  ('system:cms_news_journal_club', 'cms', 'cms_news_journal_club', 'News Journal Club', 'Club-scoped journalism contribution role.', '["article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","announcement:create:own","announcement:update:own"]', '["club"]', true, true),
  ('system:cms_editor', 'cms', 'cms_editor', 'CMS Editor', 'Assigned content editing role.', '["content:read:assigned","content:update:assigned","content:submit:assigned"]', '["organisation"]', true, true),
  ('system:cms_reviewer', 'cms', 'cms_reviewer', 'CMS Reviewer', 'Independent content review role.', '["content:read:assigned","content:review:assigned","content:reject:assigned"]', '["organisation"]', true, true),
  ('system:cms_approver', 'cms', 'cms_approver', 'CMS Approver', 'Independent content approval role.', '["content:read:assigned","content:approve:assigned","content:reject:assigned"]', '["organisation"]', true, true),
  ('system:cms_publisher', 'cms', 'cms_publisher', 'CMS Publisher', 'Approved content publication role.', '["content:read:approved","content:publish:approved","content:unpublish:published"]', '[]', true, true),
  ('system:cms_administrator', 'cms', 'cms_administrator', 'CMS Administrator', 'CMS access and configuration administration role.', '["membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms"]', '[]', true, true),
  ('system:sims_school_administrator', 'sims', 'sims_school_administrator', 'School Administrator', 'Approved school oversight capabilities without implicit deletion.', '["student:read:school","staff:read:school","attendance:read:school","assessment:read:school","report:read:school","assignment:manage:school"]', '[]', true, true),
  ('system:sims_access_administrator', 'sims', 'sims_access_administrator', 'S.I.M.S. Access Administrator', 'Approved role assignment and revocation role.', '["membership:read:sims","role:assign:approved","role:revoke:approved","audit:read:identity"]', '[]', true, true),
  ('system:sims_system_administrator', 'sims', 'sims_system_administrator', 'S.I.M.S. System Administrator', 'S.I.M.S. configuration and role-definition administration role.', '["identity:manage:sims","role:create:sims","role:update:sims","role:deactivate:sims","configuration:manage:sims","audit:read:sims"]', '[]', true, true),
  ('system:sims_operational_staff', 'sims', 'sims_operational_staff', 'S.I.M.S. Operational Staff', 'Scoped operational read and update role; policy assignments remain unresolved.', '["student:read:assigned","student:update:assigned","attendance:read:assigned","attendance:update:assigned"]', '["class","subject","department","academic_session","term","location"]', true, true)
ON CONFLICT (application, key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  scope_dimensions = EXCLUDED.scope_dimensions,
  system_managed = true,
  active = true,
  updated_at = now();

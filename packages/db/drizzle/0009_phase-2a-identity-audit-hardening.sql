CREATE FUNCTION "identity"."prevent_security_audit_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'identity security audit events are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_security_audit_immutable"
BEFORE UPDATE OR DELETE ON "identity"."security_audit_event"
FOR EACH ROW EXECUTE FUNCTION "identity"."prevent_security_audit_mutation"();
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "identity"."security_audit_event"
FROM slgs_cms, slgs_sims, slgs_platform_admin;
--> statement-breakpoint
GRANT SELECT, INSERT ON "identity"."security_audit_event"
TO slgs_sims;
--> statement-breakpoint
GRANT SELECT, INSERT ON "identity"."security_audit_event"
TO slgs_platform_admin;
--> statement-breakpoint
ALTER TABLE "identity"."security_audit_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "runtime_security_audit_application_isolation"
ON "identity"."security_audit_event"
USING (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND (application = 'sims' OR application IS NULL)) OR
  current_user = 'slgs_platform_admin'
)
WITH CHECK (
  (current_user = 'slgs_cms' AND application = 'cms') OR
  (current_user = 'slgs_sims' AND application = 'sims') OR
  current_user = 'slgs_platform_admin'
);

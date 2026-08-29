-- S.I.M.S. owns staff identity provisioning and lifecycle. CMS retains only
-- the credential mutation needed by Better Auth password recovery.
REVOKE INSERT, UPDATE ON "identity"."user" FROM slgs_cms;
--> statement-breakpoint
REVOKE INSERT ON "identity"."account" FROM slgs_cms;

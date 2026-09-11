-- Security and behavioural features outside Drizzle's schema DSL.
-- No discontinued S.I.M.S. objects or roles are created by this baseline.

CREATE FUNCTION identity.enforce_role_application_boundary() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE membership_application application_name; role_application application_name;
BEGIN
  SELECT application INTO membership_application FROM identity.application_membership WHERE id = NEW.membership_id;
  SELECT application INTO role_application FROM identity.role_definition WHERE id = NEW.role_definition_id;
  IF membership_application IS DISTINCT FROM role_application THEN RAISE EXCEPTION 'role application must match membership application'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER role_assignment_application_boundary BEFORE INSERT OR UPDATE OF membership_id, role_definition_id ON identity.role_assignment FOR EACH ROW EXECUTE FUNCTION identity.enforce_role_application_boundary();

CREATE FUNCTION identity.revoke_sessions_for_inactive_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('suspended', 'deactivated') AND OLD.status IS DISTINCT FROM NEW.status THEN DELETE FROM identity.session WHERE user_id = NEW.id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_inactive_session_revocation AFTER UPDATE OF status ON identity."user" FOR EACH ROW EXECUTE FUNCTION identity.revoke_sessions_for_inactive_identity();

CREATE FUNCTION identity.prevent_security_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'identity security audit events are immutable'; END $$;
CREATE TRIGGER identity_security_audit_immutable BEFORE UPDATE OR DELETE ON identity.security_audit_event FOR EACH ROW EXECUTE FUNCTION identity.prevent_security_audit_mutation();

CREATE FUNCTION cms.enforce_content_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.state <> OLD.state AND NOT ((OLD.state IN ('draft', 'rejected') AND NEW.state = 'submitted') OR (OLD.state = 'submitted' AND NEW.state = 'in_review') OR (OLD.state = 'in_review' AND NEW.state IN ('rejected', 'approved')) OR (OLD.state = 'approved' AND NEW.state = 'published') OR (OLD.state = 'published' AND NEW.state = 'approved')) THEN RAISE EXCEPTION 'invalid CMS workflow transition: % to %', OLD.state, NEW.state; END IF;
  IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = NEW.author_user_id THEN RAISE EXCEPTION 'an author cannot review their own content'; END IF;
  IF NEW.approved_by IS NOT NULL AND NEW.approved_by = NEW.author_user_id THEN RAISE EXCEPTION 'an author cannot approve their own content'; END IF;
  IF NEW.state IN ('approved', 'published') AND (NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL) THEN RAISE EXCEPTION 'review completion is required before approval'; END IF;
  IF NEW.state = 'published' AND (NEW.approved_at IS NULL OR NEW.approved_by IS NULL) THEN RAISE EXCEPTION 'approval is required before publication'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cms_content_workflow_guard BEFORE UPDATE ON cms.content_item FOR EACH ROW EXECUTE FUNCTION cms.enforce_content_workflow();

CREATE FUNCTION cms.prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'CMS audit events are immutable'; END $$;
CREATE TRIGGER cms_editorial_audit_immutable BEFORE UPDATE OR DELETE ON cms.editorial_audit_event FOR EACH ROW EXECUTE FUNCTION cms.prevent_audit_mutation();

ALTER VIEW public_content.announcement SET (security_barrier = true);
ALTER VIEW public_content.article SET (security_barrier = true);
ALTER VIEW public_content.event SET (security_barrier = true);
ALTER VIEW public_content.gallery SET (security_barrier = true);
ALTER VIEW public_content.page SET (security_barrier = true);

INSERT INTO cms.retention_policy (key, retention_days, enabled) VALUES ('editorial_audit', NULL, false);

INSERT INTO identity.role_definition (id, application, key, name, description, permissions, scope_dimensions, system_managed, active) VALUES
('system:cms_multimedia_club', 'cms', 'cms_multimedia_club', 'Multimedia Club', 'Club-scoped multimedia contribution role.', '["media:create:own","media:read:club","media:update:own","media:archive:own","gallery:create:own","gallery:update:own","gallery:submit:own","content:create:own","content:read:club","content:update:own","content:submit:own"]', '["club"]', true, true),
('system:cms_multimedia_club_supervisor', 'cms', 'cms_multimedia_club_supervisor', 'Multimedia Club Supervisor', 'Explicit club-scoped multimedia leadership role.', '["media:create:own","media:read:club","media:update:club","media:archive:club","content:create:own","content:read:club","content:update:assigned","content:submit:assigned","gallery:create:own","gallery:update:own","gallery:submit:own","club:read:cms","club:manage:assigned"]', '["club"]', true, true),
('system:cms_news_journal_club', 'cms', 'cms_news_journal_club', 'News Journal Club', 'Club-scoped journalism contribution role.', '["article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own"]', '["club"]', true, true),
('system:cms_news_journal_club_supervisor', 'cms', 'cms_news_journal_club_supervisor', 'News Journal Club Supervisor', 'Explicit club-scoped journalism leadership role.', '["article:create:own","article:read:club","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own","content:read:club","content:update:assigned","content:submit:assigned","club:read:cms","club:manage:assigned"]', '["club"]', true, true),
('system:cms_editor', 'cms', 'cms_editor', 'CMS Editor', 'Assigned content editing role.', '["page:create:own","page:update:own","page:submit:own","content:read:assigned","content:update:assigned","content:submit:assigned"]', '["organisation"]', true, true),
('system:cms_reviewer', 'cms', 'cms_reviewer', 'CMS Reviewer', 'Independent content review role.', '["content:read:assigned","content:review:assigned","content:reject:assigned"]', '["organisation"]', true, true),
('system:cms_approver', 'cms', 'cms_approver', 'CMS Approver', 'Independent content approval role.', '["content:read:assigned","content:approve:assigned","content:reject:assigned"]', '["organisation"]', true, true),
('system:cms_publisher', 'cms', 'cms_publisher', 'CMS Publisher', 'Approved content publication role.', '["content:read:approved","content:publish:approved","content:unpublish:published"]', '[]', true, true),
('system:cms_administrator', 'cms', 'cms_administrator', 'CMS Administrator', 'Complete CMS administration role enforced through explicit permissions.', '["media:create:own","media:read:cms","media:update:cms","media:archive:cms","content:create:own","content:read:cms","content:update:cms","content:submit:cms","page:create:own","page:update:own","page:submit:own","article:create:own","article:update:own","article:submit:own","event:create:own","event:update:own","event:submit:own","announcement:create:own","announcement:update:own","announcement:submit:own","gallery:create:own","gallery:update:own","gallery:submit:own","content:review:cms","content:reject:cms","content:approve:cms","content:read:approved","content:publish:cms","content:unpublish:cms","membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","club:manage:cms","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms","user:read:cms","user:create:cms","user:update:cms","user:deactivate:cms","session:revoke:cms"]', '[]', true, true),
('system:cms_system_administrator', 'cms', 'cms_system_administrator', 'CMS System Administrator', 'CMS-scoped identity and role administration compatibility role.', '["membership:read:cms","membership:manage:cms","audit:read:cms","configuration:manage:cms","club:read:cms","role:create:cms","role:update:cms","role:deactivate:cms","role:assign:cms","role:revoke:cms","user:read:cms","user:create:cms","user:update:cms","user:deactivate:cms","session:revoke:cms"]', '[]', true, true);

REVOKE ALL ON SCHEMA identity, cms, public_content FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA identity, cms, public_content FROM PUBLIC;
GRANT USAGE ON SCHEMA identity, cms TO slgs_cms;
GRANT USAGE ON TYPE public.authorization_scope_dimension TO slgs_cms;
GRANT SELECT, INSERT, UPDATE ON identity."user", identity.account TO slgs_cms;
GRANT SELECT, INSERT, UPDATE, DELETE ON identity.session, identity.verification, identity.two_factor TO slgs_cms;
GRANT SELECT, INSERT, UPDATE ON identity.application_membership, identity.role_assignment, identity.role_definition TO slgs_cms;
GRANT SELECT, INSERT ON identity.role_assignment_scope, identity.security_audit_event TO slgs_cms;
GRANT SELECT, INSERT, UPDATE ON cms.club, cms.content_item, cms.content_revision, cms.workflow_event, cms.media_asset, cms.content_media, cms.retention_policy TO slgs_cms;
GRANT SELECT, INSERT ON cms.editorial_audit_event TO slgs_cms;
GRANT USAGE ON SCHEMA identity TO slgs_platform_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO slgs_platform_admin;
GRANT USAGE ON SCHEMA public_content TO slgs_web;
GRANT SELECT ON ALL TABLES IN SCHEMA public_content TO slgs_web;

ALTER TABLE identity.application_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.role_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.role_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.role_assignment_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.security_audit_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY runtime_membership_application_isolation ON identity.application_membership USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin') WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');
CREATE POLICY runtime_role_definition_application_isolation ON identity.role_definition USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin') WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');
CREATE POLICY runtime_role_assignment_application_isolation ON identity.role_assignment USING (EXISTS (SELECT 1 FROM identity.application_membership membership WHERE membership.id = membership_id)) WITH CHECK (EXISTS (SELECT 1 FROM identity.application_membership membership WHERE membership.id = membership_id));
CREATE POLICY runtime_assignment_scope_application_isolation ON identity.role_assignment_scope USING (EXISTS (SELECT 1 FROM identity.role_assignment assignment WHERE assignment.id = role_assignment_id)) WITH CHECK (EXISTS (SELECT 1 FROM identity.role_assignment assignment WHERE assignment.id = role_assignment_id));
CREATE POLICY runtime_security_audit_application_isolation ON identity.security_audit_event USING ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin') WITH CHECK ((current_user = 'slgs_cms' AND application = 'cms') OR current_user = 'slgs_platform_admin');

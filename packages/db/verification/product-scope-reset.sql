DO $$
BEGIN
  IF to_regnamespace('sims') IS NOT NULL THEN
    RAISE EXCEPTION 'discontinued schema still exists';
  END IF;
  IF to_regrole('slgs_sims') IS NOT NULL THEN
    RAISE EXCEPTION 'discontinued runtime role still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM identity.application_membership WHERE application::text = 'sims') THEN
    RAISE EXCEPTION 'discontinued application membership still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM identity.role_definition WHERE application::text = 'sims') THEN
    RAISE EXCEPTION 'discontinued role definition still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM identity.privileged_bootstrap WHERE application::text = 'sims') THEN
    RAISE EXCEPTION 'discontinued bootstrap request still exists';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM identity.role_assignment assignment
    JOIN identity.application_membership membership ON membership.id = assignment.membership_id
    WHERE membership.application::text <> 'cms'
  ) THEN
    RAISE EXCEPTION 'non-CMS role assignment still exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM identity.role_definition, jsonb_array_elements_text(permissions) permission
    WHERE application::text = 'cms' AND key = 'cms_system_administrator'
      AND permission.value = 'user:create:cms'
  ) THEN
    RAISE EXCEPTION 'CMS user provisioning permission is unavailable';
  END IF;
  IF has_schema_privilege('slgs_web', 'identity', 'USAGE')
    OR has_schema_privilege('slgs_web', 'cms', 'USAGE') THEN
    RAISE EXCEPTION 'Web runtime can access a private schema';
  END IF;
  IF NOT has_schema_privilege('slgs_web', 'public_content', 'USAGE') THEN
    RAISE EXCEPTION 'Web runtime cannot access public-content projections';
  END IF;
END $$;

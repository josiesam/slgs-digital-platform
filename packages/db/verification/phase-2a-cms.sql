\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  sims_memberships integer;
  sims_roles integer;
BEGIN
  IF current_user <> 'slgs_cms' THEN
    RAISE EXCEPTION 'Phase 2A CMS verification requires the slgs_cms runtime role';
  END IF;

  SELECT count(*) INTO sims_memberships
  FROM identity.application_membership
  WHERE application = 'sims';
  SELECT count(*) INTO sims_roles
  FROM identity.role_definition
  WHERE application = 'sims';

  IF sims_memberships <> 0 OR sims_roles <> 0 THEN
    RAISE EXCEPTION 'CMS runtime can see S.I.M.S. authorization records';
  END IF;

  IF has_schema_privilege(current_user, 'cms', 'USAGE') IS FALSE OR
     has_schema_privilege(current_user, 'identity', 'USAGE') IS FALSE THEN
    RAISE EXCEPTION 'CMS runtime lacks its required schemas';
  END IF;
  IF has_table_privilege(current_user, 'identity.user', 'INSERT') OR
     has_table_privilege(current_user, 'identity.user', 'UPDATE') OR
     has_table_privilege(current_user, 'identity.account', 'INSERT') THEN
    RAISE EXCEPTION 'CMS runtime retains S.I.M.S.-owned identity lifecycle privileges';
  END IF;
  IF NOT has_table_privilege(current_user, 'identity.user', 'SELECT') OR
     NOT has_table_privilege(current_user, 'identity.account', 'SELECT,UPDATE') THEN
    RAISE EXCEPTION 'CMS runtime lacks required authentication read/recovery privileges';
  END IF;
END;
$$;

ROLLBACK;

SELECT 'Phase 2A CMS runtime isolation verification passed.' AS result;

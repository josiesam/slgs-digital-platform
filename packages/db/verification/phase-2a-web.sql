\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_user <> 'slgs_web' THEN
    RAISE EXCEPTION 'Phase 2A Web verification requires the slgs_web runtime role';
  END IF;
  IF has_schema_privilege(current_user, 'identity', 'USAGE') OR
     has_schema_privilege(current_user, 'cms', 'USAGE') OR
     (to_regnamespace('sims') IS NOT NULL AND has_schema_privilege(current_user, 'sims', 'USAGE')) THEN
    RAISE EXCEPTION 'Web runtime can access a private application schema';
  END IF;
END;
$$;

SELECT 'Phase 2A Web runtime isolation verification passed.' AS result;

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_user <> 'slgs_cms' THEN
    RAISE EXCEPTION 'Phase 2B CMS verification requires the slgs_cms runtime role';
  END IF;
  IF has_schema_privilege(current_user, 'sims', 'USAGE') OR
     has_table_privilege(current_user, 'sims.student', 'SELECT') OR
     has_table_privilege(current_user, 'sims.staff', 'SELECT') THEN
    RAISE EXCEPTION 'CMS runtime can access confidential S.I.M.S. core records';
  END IF;
END;
$$;

SELECT 'Phase 2B CMS isolation verification passed.' AS result;

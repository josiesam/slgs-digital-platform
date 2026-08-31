\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_user <> 'slgs_web' THEN
    RAISE EXCEPTION 'Phase 2C Web verification requires the slgs_web runtime role';
  END IF;
  IF has_table_privilege(current_user, 'sims.attendance_occurrence', 'SELECT') OR
     has_table_privilege(current_user, 'sims.attendance_entry', 'SELECT') OR
     has_table_privilege(current_user, 'sims.attendance_correction', 'SELECT') THEN
    RAISE EXCEPTION 'Web runtime can access confidential S.I.M.S. attendance records';
  END IF;
END;
$$;

SELECT 'Phase 2C Web isolation verification passed.' AS result;

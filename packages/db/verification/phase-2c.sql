\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  prefix text := 'phase2c-' || txid_current()::text;
  deletion_rejected boolean := false;
BEGIN
  IF current_user <> 'slgs_sims' THEN
    RAISE EXCEPTION 'Phase 2C verification requires the slgs_sims runtime role';
  END IF;
  IF NOT has_schema_privilege(current_user, 'sims', 'USAGE') THEN
    RAISE EXCEPTION 'S.I.M.S. runtime lacks the sims schema';
  END IF;
  
  -- Check least privilege (no DELETE)
  IF NOT has_table_privilege(current_user, 'sims.attendance_occurrence', 'SELECT,INSERT,UPDATE') OR
     has_table_privilege(current_user, 'sims.attendance_occurrence', 'DELETE') THEN
    RAISE EXCEPTION 'S.I.M.S. attendance_occurrence privileges violate least privilege';
  END IF;
  IF NOT has_table_privilege(current_user, 'sims.attendance_entry', 'SELECT,INSERT,UPDATE') OR
     has_table_privilege(current_user, 'sims.attendance_entry', 'DELETE') THEN
    RAISE EXCEPTION 'S.I.M.S. attendance_entry privileges violate least privilege';
  END IF;
  IF NOT has_table_privilege(current_user, 'sims.attendance_correction', 'SELECT,INSERT,UPDATE') OR
     has_table_privilege(current_user, 'sims.attendance_correction', 'DELETE') THEN
    RAISE EXCEPTION 'S.I.M.S. attendance_correction privileges violate least privilege';
  END IF;

  -- Verify Role Definitions
  IF NOT EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_school_administrator'
      AND permissions @> '["attendance:read:school","attendance:create:school","attendance:correct:school"]'::jsonb
  ) THEN
    RAISE EXCEPTION 'School Administrator Phase 2C role permissions are incomplete';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_system_administrator'
      AND permissions @> '["attendance:read:school","attendance:create:school","attendance:correct:school"]'::jsonb
  ) THEN
    RAISE EXCEPTION 'System Administrator Phase 2C role permissions are incomplete';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_operational_staff'
      AND permissions @> '["attendance:read:assigned","attendance:create:assigned","attendance:correct:assigned"]'::jsonb
  ) THEN
    RAISE EXCEPTION 'Operational Staff Phase 2C role permissions are incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM identity.role_definition
    WHERE application = 'sims' AND key = 'sims_access_administrator'
      AND permissions ?| ARRAY['attendance:read:school','attendance:create:school','attendance:correct:school','attendance:read:assigned','attendance:create:assigned','attendance:correct:assigned']
  ) THEN
    RAISE EXCEPTION 'Access Administrator inherited Phase 2C record permissions';
  END IF;

  -- Create synthetic records to verify schema constraints
  INSERT INTO sims.academic_session (id, name, start_date, end_date)
  VALUES (prefix || '-session', 'Synthetic ' || prefix, '2026-09-01', '2027-07-31');
  
  INSERT INTO sims.academic_class (id, academic_session_id, code, name)
  VALUES (prefix || '-class', prefix || '-session', 'SYN-2C', 'Synthetic Class 2C');
  
  INSERT INTO sims.student (id, student_number, admission_number, first_name, last_name, class_id)
  VALUES (prefix || '-student', prefix || '-student-number', prefix || '-admission', 'Synthetic', 'Student', prefix || '-class');
  
  -- Insert user for recorder
  INSERT INTO identity.user (id, name, email, status)
  VALUES (prefix || '-user', 'Synthetic User', prefix || '@slgs.edu.sl', 'active');
  
  -- Insert occurrence
  INSERT INTO sims.attendance_occurrence (id, academic_session_id, class_id, attendance_date, status, recorder_user_id)
  VALUES (prefix || '-occurrence', prefix || '-session', prefix || '-class', '2026-09-01', 'active', prefix || '-user');
  
  -- Insert entry
  INSERT INTO sims.attendance_entry (id, occurrence_id, student_id, state)
  VALUES (prefix || '-entry', prefix || '-occurrence', prefix || '-student', 'present');
  
  -- Insert correction
  INSERT INTO sims.attendance_correction (id, entry_id, state, actor_user_id, reason)
  VALUES (prefix || '-correction', prefix || '-entry', 'excused', prefix || '-user', 'Correction reason');

  -- Verify uniqueness constraints
  BEGIN
    INSERT INTO sims.attendance_occurrence (id, academic_session_id, class_id, attendance_date, recorder_user_id)
    VALUES (prefix || '-occurrence-dup', prefix || '-session', prefix || '-class', '2026-09-01', prefix || '-user');
    RAISE EXCEPTION 'Duplicate occurrence uniqueness check failed';
  EXCEPTION WHEN unique_violation THEN
    -- expected behavior
  END;

  BEGIN
    INSERT INTO sims.attendance_entry (id, occurrence_id, student_id, state)
    VALUES (prefix || '-entry-dup', prefix || '-occurrence', prefix || '-student', 'absent');
    RAISE EXCEPTION 'Duplicate entry student uniqueness check failed';
  EXCEPTION WHEN unique_violation THEN
    -- expected behavior
  END;

  -- Test Finalization
  UPDATE sims.attendance_occurrence SET status = 'finalized', updated_at = now() WHERE id = prefix || '-occurrence';
  IF (SELECT status FROM sims.attendance_occurrence WHERE id = prefix || '-occurrence') <> 'finalized' THEN
    RAISE EXCEPTION 'S.I.M.S. occurrence finalization update was not persisted';
  END IF;

  -- Ensure DELETE fails
  BEGIN
    DELETE FROM sims.attendance_entry WHERE id = prefix || '-entry';
  EXCEPTION WHEN insufficient_privilege THEN
    deletion_rejected := true;
  END;
  IF NOT deletion_rejected THEN
    RAISE EXCEPTION 'S.I.M.S. runtime entry deletion was not rejected';
  END IF;

END;
$$;

ROLLBACK;

SELECT 'Phase 2C S.I.M.S. runtime verification passed; synthetic transaction rolled back.' AS result;
